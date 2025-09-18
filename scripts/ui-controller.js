class UIController {
    constructor() {
        this.eyeCountElement = document.getElementById('eyeCount');
        this.eyebrowCountElement = document.getElementById('eyebrowCount');
        this.mouthCountElement = document.getElementById('mouthCount');
        this.startBtn = document.getElementById('startBtn');
        this.resetBtn = document.getElementById('resetBtn');
        
        this.isTracking = false;
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        this.startBtn.addEventListener('click', () => {
            this.toggleTracking();
        });
        
        this.resetBtn.addEventListener('click', () => {
            this.resetCounters();
        });
    }
    
    async toggleTracking() {
        if (!this.isTracking) {
            // Iniciar seguimiento
            this.startBtn.textContent = 'Detener';
            this.startBtn.classList.remove('btn-success');
            this.startBtn.classList.add('btn-warning');
            this.isTracking = true;
            
            if (window.mediaPipeController) {
                await window.mediaPipeController.start();
            }
        } else {
            // Detener seguimiento
            this.startBtn.textContent = 'Iniciar';
            this.startBtn.classList.remove('btn-warning');
            this.startBtn.classList.add('btn-success');
            this.isTracking = false;
            
            if (window.mediaPipeController) {
                window.mediaPipeController.stop();
            }
        }
    }
    
    resetCounters() {
        if (window.mediaPipeController) {
            window.mediaPipeController.resetCounters();
        }
    }
    
    updateCounters(eyeCount, eyebrowCount, mouthCount) {
        this.eyeCountElement.textContent = eyeCount;
        this.eyebrowCountElement.textContent = eyebrowCount;
        this.mouthCountElement.textContent = mouthCount;
    }
}