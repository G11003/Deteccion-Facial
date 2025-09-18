document.addEventListener('DOMContentLoaded', async function() {
    // Verificar si estamos en un entorno seguro (HTTPS o localhost o 127.0.0.1)
    const isSecure = location.protocol === 'https:' || 
                    location.hostname === 'localhost' || 
                    location.hostname === '127.0.0.1';
    
    if (!isSecure) {
        alert('Esta aplicación necesita HTTPS o localhost para acceder a la cámara. Por favor, sirve los archivos desde un servidor local.');
        console.warn('La aplicación debe ejecutarse en HTTPS, localhost o 127.0.0.1');
        return;
    }
    
    try {
        console.log('Verificando carga de MediaPipe...');
        
        // Función para verificar si MediaPipe está cargado
        function checkMediaPipeLoaded() {
            return typeof FaceMesh !== 'undefined' && 
                   typeof Camera !== 'undefined' &&
                   typeof drawConnectors !== 'undefined' &&
                   typeof FACEMESH_TESSELATION !== 'undefined';
        }
        
        // Esperar a que MediaPipe cargue
        if (checkMediaPipeLoaded()) {
            initializeApp();
        } else {
            // Esperar un poco más si no está cargado inmediatamente
            let attempts = 0;
            const maxAttempts = 20; // 10 segundos máximo
            
            const checkInterval = setInterval(() => {
                attempts++;
                if (checkMediaPipeLoaded()) {
                    clearInterval(checkInterval);
                    initializeApp();
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    console.error('MediaPipe no se cargó después de varios intentos');
                    showError('Error al cargar las bibliotecas de detección facial. Recarga la página.');
                }
            }, 500);
        }
        
    } catch (error) {
        console.error('Error al inicializar la aplicación:', error);
        showError('Error: ' + error.message);
    }
    
    function initializeApp() {
        console.log('MediaPipe cargado correctamente');
        
        // Inicializar controladores
        window.uiController = new UIController();
        window.mediaPipeController = new MediaPipeController();
        
        console.log('Aplicación inicializada correctamente');
    }
    
    function showError(message) {
        // Crear elemento de error si no existe
        let errorDiv = document.getElementById('globalError');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'globalError';
            errorDiv.className = 'alert alert-danger m-3';
            document.body.prepend(errorDiv);
        }
        errorDiv.textContent = message;
    }
});