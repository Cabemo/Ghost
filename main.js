// ThreeJS
let camera;
let dom;
let ground;
let loader;
let renderer;
let sceneWidth;
let sceneHeight;
let scene;
let sun;
// Game logic
let lives = 3;
let jumping;
let lastHit;
let meters = 0;
let playing = false;
let path;
let bounceValue = 0.1;
// Game Elements
let barrel;
let tree;
let world;


const paths = {
	left: -1,
	center: 0,
	right: 1
};
// Trees
const treeScale = 0.2;
const pathTrees = [];
const treePool = [];
const treeReleaseInterval = 0.5;
const maxPool = 10;
// World
const clock = new THREE.Clock();
const sides = 40;
const tiers = 40;
const worldRadius = 26;
const worldSpeed = 0.008;
const gravity = 0.005;
const worldRepresentation = new THREE.Spherical();
const pathAngleValues = [1.52, 1.57, 1.62];
// Barrel
const barrelScale = 0.3;
const barrelRadius = 0.2;
const barrelBase = 1.8;
const barrelAngularSpeed = (worldSpeed * worldRadius) / 10;

setup();

function setup() {
	loader = new THREE.GLTFLoader();
	// Add Tree
	loader.load('./models/Tree.glb', treeModel => {
		tree = treeModel.scene;
		tree.scale.set(treeScale, treeScale, treeScale);
		// Add Barrel
		loader.load('./models/Barrel.glb', barrelModel => {
			barrel = barrelModel.scene;
			jumping = false;
			barrel.receiveShadow = true;
			barrel.castShadow = true;
			barrel.scale.set(barrelScale, barrelScale, barrelScale);
			barrel.position.y = barrelBase;
			barrel.position.z = 4.8;
			path = paths.left;
			barrel.position.x = path;

			draw();

			update();
		});
	});
}

function draw() {
	hasCollided = false;
	score = 0;


	clock.start();
	sceneWidth = window.innerWidth;
	sceneHeight = window.innerHeight;
	scene = new THREE.Scene();
	scene.fog = new THREE.FogExp2(0xf0fff0, 0.14);
	camera = new THREE.PerspectiveCamera(60, sceneWidth / sceneHeight, 0.1, 1000);

	renderer = new THREE.WebGLRenderer({ alpha: true });
	renderer.setClearColor(0xfffafa, 1);
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	renderer.setSize(sceneWidth, sceneHeight);

	dom = document.getElementById('canvas');
	start = document.getElementById('start');
	menu = document.getElementById('menu');
	stats = document.getElementById('stats');
	meter = document.getElementById('meters');
	statsLives = document.getElementById('lives');

	// Add pool of trees for obstacles
	for (let i = 0; i < maxPool; i++) treePool.push(tree.clone());
	// Add World (Rotating sphere)
	addWorld();
	// Add player (barrel)
	scene.add(barrel);
	addLight();

	camera.position.z = 6.5;
	camera.position.y = 2.5;

	dom.appendChild(renderer.domElement);
	window.addEventListener('resize', onWindowResize, false);
	start.addEventListener('click', onStart);
	document.onkeydown = onKeyDown;


}
function addWorld() {
	let worldGeometry = new THREE.SphereGeometry(worldRadius, sides, tiers);
	let worldMaterial = new THREE.MeshStandardMaterial({ color: 0xfffafa, flatShading: THREE.FlatShading });

	let vertexIndex;
	let vertexVector = new THREE.Vector3();
	let nextVertexVector = new THREE.Vector3();
	let firstVertexVector = new THREE.Vector3();
	let offset = new THREE.Vector3();
	let currentTier = 1;
	let lerpValue = 0.5;
	let heightValue;
	let maxHeight = 0.07;
	for (let j = 1; j < tiers - 2; j++) {
		currentTier = j;
		for (let i = 0; i < sides; i++) {
			vertexIndex = (currentTier * sides) + 1;
			vertexVector = worldGeometry.vertices[i + vertexIndex].clone();
			if (j % 2 !== 0) {
				if (i == 0) {
					firstVertexVector = vertexVector.clone();
				}
				nextVertexVector = worldGeometry.vertices[i + vertexIndex + 1].clone();
				if (i == sides - 1) {
					nextVertexVector = firstVertexVector;
				}
				lerpValue = (Math.random() * (0.75 - 0.25)) + 0.25;
				vertexVector.lerp(nextVertexVector, lerpValue);
			}
			heightValue = (Math.random() * maxHeight) - (maxHeight / 2);
			offset = vertexVector.clone().normalize().multiplyScalar(heightValue);
			worldGeometry.vertices[i + vertexIndex] = (vertexVector.add(offset));
		}
	}
	world = new THREE.Mesh(worldGeometry, worldMaterial);
	world.receiveShadow = true;
	world
		.castShadow = false;
	world.rotation.z = -Math.PI / 2;
	scene.add(world);
	world.position.y = -24;
	world.position.z = 2;
	let numTrees = 36;
	let gap = worldRadius / 36;
	for (let i = 0; i < numTrees; i++) {
		addTree(false, i * gap, true);
		addTree(false, i * gap, false);
	}
}
function addLight() {
	let hemisphereLight = new THREE.HemisphereLight(0xfffafa, 0x000000, .9);
	scene.add(hemisphereLight);
	sun = new THREE.DirectionalLight(0xcdc1c5, 0.9);
	sun.position.set(12, 6, -7);
	sun.castShadow = true;
	scene.add(sun);

	sun.shadow.mapSize.width = 256;
	sun.shadow.mapSize.height = 256;
	sun.shadow.camera.near = 0.5;
	sun.shadow.camera.far = 50;
}
function addPathTree() {
	let options = [0, 1, 2];
	let lane = Math.floor(Math.random() * 3);
	addTree(true, lane);
	options.splice(lane, 1);
	if (Math.random() > 0.5) {
		lane = Math.floor(Math.random() * 2);
		addTree(true, options[lane]);
	}
}
function addTree(inPath, row, isLeft) {
	let newTree;
	if (inPath) {
		if (treePool.length == 0) return;
		newTree = treePool.pop();
		newTree.visible = true;

		pathTrees.push(newTree);
		worldRepresentation.set(worldRadius - 0.2, pathAngleValues[row], -world.rotation.x + 2);
	} else {
		newTree = tree.clone();
		let forestAreaAngle = 0;
		if (isLeft) {
			forestAreaAngle = 1.68 + Math.random() * 0.1;
		} else {
			forestAreaAngle = 1.46 - Math.random() * 0.1;
		}
		worldRepresentation.set(worldRadius - 0.1, forestAreaAngle, row);
	}
	newTree.position.setFromSpherical(worldRepresentation);
	let rollingGroundVector = world.position.clone().normalize();
	let treeVector = newTree.position.clone().normalize();
	newTree.quaternion.setFromUnitVectors(treeVector, rollingGroundVector);
	newTree.rotation.x += (Math.random() * (2 * Math.PI / 10)) + -Math.PI / 10;

	world.add(newTree);
}

function update() {

	if (playing) {
		world.rotation.x += worldSpeed;
		const currentRotation = world.rotation.x;
		meter.innerHTML = (currentRotation * 100).toFixed(0);
		barrel.rotation.x -= barrelAngularSpeed;
		if (barrel.position.y <= barrelBase) {
			jumping = false;
			bounceValue = (Math.random() * 0.04) + 0.005;
		}
		barrel.position.y += bounceValue;
		bounceValue -= gravity;
	}
	barrel.position.x = THREE.Math.lerp(barrel.position.x, path, 2 * clock.getDelta());

	if (clock.getElapsedTime() > treeReleaseInterval) {
		clock.start();
		addPathTree();
	}
	doTreeLogic();
	render();
	requestAnimationFrame(update);
}
function doTreeLogic() {
	let oneTree;
	let treePos = new THREE.Vector3();
	let treesToRemove = [];
	let hitEnded = false;
	pathTrees.forEach(function (oneTree) {
		treePos.setFromMatrixPosition(oneTree.matrixWorld);
		if (treePos.z > 6 && oneTree.visible) {
			treesToRemove.push(oneTree);
		} else {
			if (treePos.distanceTo(barrel.position) <= 0.3) {
				if (lives === 3 || (lastHit !== oneTree && !hitEnded)) {
					--lives;
					lastHit = oneTree;
					statsLives.innerHTML = lives;
					hitEnded = true;
					switch (lives) {
						case 2:
							barrel.children[1].rotation.z = 0.2;
							barrel.children[1].position.y = -0.2;
							break;
						case 1:
							barrel.children[2].position.x = 0.1;
							break;
						case 0:
							playing = false;
							break;
					}

				}
			}
		}
	});
	hitEnded = true;
	let fromWhere;
	treesToRemove.forEach(function (element, index) {
		oneTree = treesToRemove[index];
		fromWhere = pathTrees.indexOf(oneTree);
		pathTrees.splice(fromWhere, 1);
		treePool.push(oneTree);
		oneTree.visible = false;
		console.log("remove tree");
	});
}

function render() {
	renderer.render(scene, camera);
}
const gameOver = () => {

};
const onKeyDown = (keyEvent) => {
	if (jumping) return;
	let validMove = true;

	switch (keyEvent.keyCode) {
		case 27:
			menu.style.opacity = 100;
			stats.style.opacity = 100;
			playing = false;
			path = paths.left;
			while (barrel.rotation.z > 0) barrel.rotation.z -= 0.0001;
		case 37:
			if (path == paths.center) {
				path = paths.left;
			} else if (path == paths.right) {
				path = paths.center;
			} else {
				validMove = false;
			}
			break;
		case 38:
			bounceValue = 0.1;
			jumping = true;
			validMove = false;
			break;
		case 39:
			if (path == paths.center) {
				path = paths.right;
			} else if (path == paths.left) {
				path = paths.center;
			} else {
				validMove = false;
			}
			break;
	}

	if (validMove) {
		jumping = true;
	}
}
const onWindowResize = () => {

	sceneHeight = window.innerHeight;
	sceneWidth = window.innerWidth;
	renderer.setSize(sceneWidth, sceneHeight);
	camera.aspect = sceneWidth / sceneHeight;
	camera.updateProjectionMatrix();
};
const onStart = () => {
	menu.style.opacity = 0;
	stats.style.opacity = 100;

	playing = true;
	jumping = true;
	bounceValue = 0.1;
	lives = 3;
	path = paths.center;
	while (barrel.rotation.z < 1.6) barrel.rotation.z += 0.0001;
	barrel.position.y += 0.1;
};
