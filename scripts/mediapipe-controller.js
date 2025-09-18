class MediaPipeController {
    constructor() {
        // --- Contadores y Estados ---
        this.eyeCount = 0;
        this.eyebrowCount = 0;
        this.mouthCount = 0;
        
        this.eyeState = 'open';
        this.eyebrowState = 'relaxed';
        this.mouthState = 'closed';

        // --- Elementos del DOM ---
        this.videoElement = document.getElementById('videoElement');
        this.canvasElement = document.getElementById('canvasElement');
        this.canvasCtx = this.canvasElement.getContext('2d');
        this.cameraError = document.getElementById('cameraError');
        
        // Ajustar tamaño del canvas
        this.canvasElement.width = 640;
        this.canvasElement.height = 480;
        
        // --- Instancias de MediaPipe ---
        this.faceMesh = null;
        this.camera = null;
        this.isRunning = false;

        // --- Propiedades para Detección Mejorada de Cejas ---
        this.eyebrowBaseline = null;
        this.lastEyebrowTime = null;
        this.eyebrowBaselineBuffer = []; // Buffer para una calibración inicial más estable
        this.BASELINE_FRAMES_COUNT = 30; // Número de frames para calibrar al inicio
        
        this.initializeFaceMesh();
    }
    
    async initializeFaceMesh() {
        try {
            this.faceMesh = new FaceMesh({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
            });
            
            this.faceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });
            
            this.faceMesh.onResults(this.onResults.bind(this));
            
            console.log('FaceMesh inicializado correctamente');
        } catch (error) {
            console.error('Error al inicializar FaceMesh:', error);
            this.showCameraError('Error al cargar el modelo de detección facial');
        }
    }
    
    async start() {
        if (this.isRunning) return;
        
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Tu navegador no soporta acceso a la cámara');
            }
            
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                },
                audio: false
            });
            
            this.videoElement.srcObject = stream;
            
            await new Promise((resolve) => {
                this.videoElement.onloadedmetadata = () => resolve();
            });
            
            this.camera = new Camera(this.videoElement, {
                onFrame: async () => {
                    if (this.faceMesh && this.isRunning) {
                        await this.faceMesh.send({image: this.videoElement});
                    }
                },
                width: this.videoElement.videoWidth,
                height: this.videoElement.videoHeight
            });
            
            await this.camera.start();
            this.isRunning = true;
            this.hideCameraError();
            console.log('Cámara iniciada correctamente');
            
        } catch (error) {
            console.error('Error al iniciar la cámara:', error);
            this.showCameraError(`Error al acceder a la cámara: ${error.message}`);
        }
    }
    
    stop() {
        if (this.camera && this.isRunning) {
            this.camera.stop();
            this.isRunning = false;
            
            if (this.videoElement.srcObject) {
                const tracks = this.videoElement.srcObject.getTracks();
                tracks.forEach(track => track.stop());
                this.videoElement.srcObject = null;
            }
            console.log('Cámara detenida');
        }
    }
    
    showCameraError(message) {
        if (this.cameraError) {
            this.cameraError.textContent = message;
            this.cameraError.classList.remove('d-none');
        }
    }
    
    hideCameraError() {
        if (this.cameraError) {
            this.cameraError.classList.add('d-none');
        }
    }
    
    onResults(results) {
        this.canvasCtx.save();
        this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        
        if (results.image) {
            this.canvasCtx.drawImage(
                results.image, 0, 0, this.canvasElement.width, this.canvasElement.height);
        }
        
        if (results.multiFaceLandmarks) {
            for (const landmarks of results.multiFaceLandmarks) {
                drawConnectors(
                    this.canvasCtx, landmarks, FACEMESH_TESSELATION,
                    {color: '#C0C0C070', lineWidth: 1});
                
                this.detectEyeMovement(landmarks);
                this.detectEyebrowMovement(landmarks); // Llama a la versión optimizada
                this.detectMouthMovement(landmarks);
            }
        }
        
        this.canvasCtx.restore();
        
        if (window.uiController) {
            window.uiController.updateCounters(this.eyeCount, this.eyebrowCount, this.mouthCount);
        }
    }
    
    detectEyeMovement(landmarks) {
        const leftEyeUpper = landmarks[159];
        const leftEyeLower = landmarks[145];
        const rightEyeUpper = landmarks[386];
        const rightEyeLower = landmarks[374];

        const leftEyeDistance = Math.abs(leftEyeUpper.y - leftEyeLower.y);
        const rightEyeDistance = Math.abs(rightEyeUpper.y - rightEyeLower.y);
        const avgEyeDistance = (leftEyeDistance + rightEyeDistance) / 2;

        const eyeThreshold = 0.018; 
        const currentTime = Date.now();

        if (this.eyeState === 'open' && avgEyeDistance < eyeThreshold) {
            if (!this.lastBlinkTime || (currentTime - this.lastBlinkTime) > 200) {
                this.eyeState = 'closed';
                this.eyeCount++;
                this.lastBlinkTime = currentTime;
                console.log("Parpadeo detectado! Total:", this.eyeCount);
            }
        } else if (this.eyeState === 'closed' && avgEyeDistance >= eyeThreshold) {
            this.eyeState = 'open';
        }
    }

    detectEyebrowMovement(landmarks) {
        // Puntos de referencia de las cejas (sin cambios)
        const leftEyebrowPoints = [70, 63, 105, 66, 107];
        const rightEyebrowPoints = [336, 296, 334, 293, 300];

        // PUNTO CLAVE: Usamos un punto estable en el puente de la nariz (entre los ojos)
        // en lugar de los párpados. Este punto no se mueve al parpadear.
        const stableReferencePoint = landmarks[168]; 
        if (!stableReferencePoint) return;

        // Calculamos la posición Y promedio de las cejas
        const avg = (arr) => arr.reduce((sum, index) => sum + landmarks[index].y, 0) / arr.length;
        const eyebrowsY = (avg(leftEyebrowPoints) + avg(rightEyebrowPoints)) / 2;
        
        // La distancia vertical entre el punto estable de la nariz y las cejas.
        const eyebrowDistance = stableReferencePoint.y - eyebrowsY;

        // --- Calibración Inicial Mejorada ---
        // Durante los primeros frames, llenamos un buffer para obtener una línea base promedio y estable.
        if (this.eyebrowBaselineBuffer.length < this.BASELINE_FRAMES_COUNT) {
            this.eyebrowBaselineBuffer.push(eyebrowDistance);
            return; // Salimos mientras calibramos
        }
        
        // Cuando el buffer está lleno, calculamos la línea base y el umbral una sola vez.
        if (!this.eyebrowBaseline) {
            this.eyebrowBaseline = this.eyebrowBaselineBuffer.reduce((a, b) => a + b, 0) / this.BASELINE_FRAMES_COUNT;
            this.eyebrowThreshold = this.eyebrowBaseline * 0.12; 
            console.log('Calibración de cejas completa. Línea base:', this.eyebrowBaseline);
        }

        // --- Detección y Debounce ---
        const isRaised = eyebrowDistance > (this.eyebrowBaseline + this.eyebrowThreshold);
        const currentTime = Date.now();

        if (this.eyebrowState === 'relaxed' && isRaised) {
            if (!this.lastEyebrowTime || (currentTime - this.lastEyebrowTime) > 500) {
                this.eyebrowState = 'raised';
                this.eyebrowCount++;
                this.lastEyebrowTime = currentTime;
                console.log("Movimiento de cejas detectado! Total:", this.eyebrowCount);
            }
        } else if (this.eyebrowState === 'raised' && !isRaised) {
            this.eyebrowState = 'relaxed';
        }

        // --- Adaptación lenta de la línea base ---
        if (this.eyebrowState === 'relaxed') {
            this.eyebrowBaseline = this.eyebrowBaseline * 0.99 + eyebrowDistance * 0.01;
        }
    }
    
    detectMouthMovement(landmarks) {
        const upperLip = landmarks[13];
        const lowerLip = landmarks[14];
        
        const mouthDistance = Math.abs(upperLip.y - lowerLip.y);
        const mouthThreshold = 0.05;
        
        if (this.mouthState === 'closed' && mouthDistance > mouthThreshold) {
            this.mouthState = 'open';
            this.mouthCount++;
        } else if (this.mouthState === 'open' && mouthDistance <= mouthThreshold) {
            this.mouthState = 'closed';
        }
    }
    
    resetCounters() {
        this.eyeCount = 0;
        this.eyebrowCount = 0;
        this.mouthCount = 0;
        
        this.eyeState = 'open';
        this.eyebrowState = 'relaxed';
        this.mouthState = 'closed';
        
        // Resetear variables de calibración de cejas
        this.eyebrowBaseline = null;
        this.lastEyebrowTime = null;
        this.eyebrowBaselineBuffer = []; // Importante vaciar el buffer
        
        if (window.uiController) {
            window.uiController.updateCounters(this.eyeCount, this.eyebrowCount, this.mouthCount);
        }
        
        console.log('Contadores y calibración reiniciados');
    }
}