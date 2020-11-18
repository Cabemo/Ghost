let camera, scene, renderer;
const meshes = [];

/**
 * Guarda nuestra aplicación como objeto
 */
class App {
	init() {

		camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 300000);
		camera.position.z = 400;

		scene = new THREE.Scene();
		loader = new THREE.TextureLoader();

		renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(window.innerWidth, window.innerHeight);
		document.body.appendChild(renderer.domElement);

		window.addEventListener('resize', onWindowResize, false);
		scene.fog = new THREE.FogExp2(0xf0fff0, 0.14);
		controls = new THREE.OrbitControls(camera, renderer.domElement);
		// Actualiza todos los objetos
		update();
	}

}

const update = () => {
	requestAnimationFrame(update);

	controls.update();

	renderer.render(scene, camera);
};
// Para actualizar nuestra imagen
const onWindowResize = () => {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize(window.innerWidth, window.innerHeight);

};
