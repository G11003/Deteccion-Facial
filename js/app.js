async function loadCascade(url, filename) {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const data = new Uint8Array(buffer);
  cv.FS_createDataFile("/", filename, data, true, false, false);
  const classifier = new cv.CascadeClassifier();
  classifier.load(filename);
  return classifier;
}

let classifierFace, classifierEyes, classifierMouth;

cv['onRuntimeInitialized'] = async () => {
  // Cargar clasificadores desde assets/haarcascades
  classifierFace = await loadCascade("assets/haarcascades/haarcascade_frontalface_default.xml", "face.xml");
  classifierEyes = await loadCascade("assets/haarcascades/haarcascade_eye.xml", "eye.xml");
  classifierMouth = await loadCascade("assets/haarcascades/haarcascade_mcs_mouth.xml", "mouth.xml");

  console.log("Clasificadores cargados ✅");
  startVideo();
};
