import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.mjs';

const fileInput = document.getElementById('fileInput');
const canvasWrapper = document.getElementById('canvas-wrapper');
const toolsContainer = document.querySelector('.tools-container');
const nameButtonsContainer = document.querySelector('.name-buttons');
const undoButton = document.getElementById('undoButton');
const saveButton = document.getElementById('saveButton');
const penButton = document.getElementById('penButton');
const checkButton = document.getElementById('checkButton');
const fileNameInput = document.getElementById('fileNameInput');
const homeButton = document.getElementById('homeButton');
const nameButtons = document.querySelectorAll('.name-buttons .name-btn');
const customTextInput = document.getElementById('customTextInput');
const applyTextButton = document.getElementById('applyTextButton');

let currentTool = 'pen';
let currentText = ''; 
let history = {}; // 각 페이지의 변경사항을 저장할 객체
let pageCanvases = []; 

function setActiveButton(activeButton) {
    penButton.classList.remove('active');
    checkButton.classList.remove('active');
    nameButtons.forEach(btn => btn.classList.remove('active'));
    applyTextButton.classList.remove('active');
    
    if (activeButton) {
        activeButton.classList.add('active');
    }
}

function addDrawingListeners(drawingCanvas, pageId) {
    let ctx = drawingCanvas.getContext('2d');
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    function saveHistory() {
        history[pageId] = history[pageId] || [];
        history[pageId].push(drawingCanvas.toDataURL());
    }

    function draw(e) {
        if (!isDrawing) return;
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000000';
        const rect = drawingCanvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (drawingCanvas.width / rect.width);
        const y = (e.clientY - rect.top) * (drawingCanvas.height / rect.height);
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
        [lastX, lastY] = [x, y];
    }

    drawingCanvas.addEventListener('mousedown', (e) => {
        if (currentTool === 'pen') {
            isDrawing = true;
            const rect = drawingCanvas.getBoundingClientRect();
            lastX = (e.clientX - rect.left) * (drawingCanvas.width / rect.width);
            lastY = (e.clientY - rect.top) * (drawingCanvas.height / rect.height);
            ctx.globalCompositeOperation = 'source-over';
        }
    });

    drawingCanvas.addEventListener('mousemove', (e) => {
        if (currentTool === 'pen') {
            draw(e);
        }
    });

    drawingCanvas.addEventListener('mouseup', () => {
        if (currentTool === 'pen') {
            isDrawing = false;
            saveHistory();
        }
    });

    drawingCanvas.addEventListener('mouseout', () => {
        if (currentTool === 'pen') {
            isDrawing = false;
        }
    });

    drawingCanvas.addEventListener('click', (e) => {
        const rect = drawingCanvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (drawingCanvas.width / rect.width);
        const y = (e.clientY - rect.top) * (drawingCanvas.height / rect.height);

        if (currentTool === 'check') {
            const checkSize = 30;
            const checkThickness = 3;
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = checkThickness;
            ctx.beginPath();
            ctx.moveTo(x - checkSize / 2, y + checkSize / 4);
            ctx.lineTo(x, y + checkSize / 2);
            ctx.lineTo(x + checkSize / 2, y - checkSize / 2);
            ctx.stroke();
            saveHistory();
        } else if (currentTool === 'text' && currentText) {
            ctx.font = '24px Arial';
            ctx.fillStyle = '#000000';
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillText(currentText, x, y);
            saveHistory();
        }
    });
}

async function renderPDF(fileUrl) {
    try {
        const loadingTask = pdfjsLib.getDocument(fileUrl);
        const pdf = await loadingTask.promise;
        canvasWrapper.innerHTML = '';
        pageCanvases = [];
        history = {};

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const initialViewport = page.getViewport({ scale: 1 });
            const containerWidth = canvasWrapper.clientWidth;
            const scaleFactor = containerWidth / initialViewport.width;

            const viewport = page.getViewport({ scale: scaleFactor });

            const pageContainer = document.createElement('div');
            pageContainer.className = 'page-container';
            pageContainer.dataset.pageId = `page-${pageNum}`;
            
            const backgroundCanvas = document.createElement('canvas');
            const drawingCanvas = document.createElement('canvas');
            backgroundCanvas.className = 'backgroundCanvas';
            drawingCanvas.className = 'drawingCanvas';
            
            backgroundCanvas.width = viewport.width;
            backgroundCanvas.height = viewport.height;
            drawingCanvas.width = viewport.width;
            drawingCanvas.height = viewport.height;

            const bgCtx = backgroundCanvas.getContext('2d');
            const renderContext = {
                canvasContext: bgCtx,
                viewport: viewport,
            };
            await page.render(renderContext).promise;

            addDrawingListeners(drawingCanvas, `page-${pageNum}`);
            pageCanvases.push(drawingCanvas);

            pageContainer.appendChild(backgroundCanvas);
            pageContainer.appendChild(drawingCanvas);
            canvasWrapper.appendChild(pageContainer);
            
            // 초기 상태 저장
            history[`page-${pageNum}`] = [drawingCanvas.toDataURL()];
        }

        toolsContainer.style.display = 'block';
        nameButtonsContainer.style.display = 'block';
    } catch (err) {
        console.error('PDF 로드 오류:', err);
        alert('PDF 파일을 로드할 수 없습니다.');
        toolsContainer.style.display = 'none';
        nameButtonsContainer.style.display = 'none';
    }
}

function drawImageOnCanvas(image) {
    canvasWrapper.innerHTML = '';
    const pageContainer = document.createElement('div');
    pageContainer.className = 'page-container';
    pageContainer.dataset.pageId = 'page-1';
    
    const backgroundCanvas = document.createElement('canvas');
    const drawingCanvas = document.createElement('canvas');
    backgroundCanvas.className = 'backgroundCanvas';
    drawingCanvas.className = 'drawingCanvas';
    
    const newWidth = image.width;
    const newHeight = image.height;
    backgroundCanvas.width = newWidth;
    backgroundCanvas.height = newHeight;
    drawingCanvas.width = newWidth;
    drawingCanvas.height = newHeight;
    
    const bgCtx = backgroundCanvas.getContext('2d');
    bgCtx.drawImage(image, 0, 0, newWidth, newHeight);
    
    addDrawingListeners(drawingCanvas, 'page-1');
    pageCanvases = [drawingCanvas];
    
    pageContainer.appendChild(backgroundCanvas);
    pageContainer.appendChild(drawingCanvas);
    canvasWrapper.appendChild(pageContainer);
    
    toolsContainer.style.display = 'block';
    nameButtonsContainer.style.display = 'block';
    
    history['page-1'] = [drawingCanvas.toDataURL()];
}

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) {
        toolsContainer.style.display = 'none';
        nameButtonsContainer.style.display = 'none';
        return;
    }
    const fileUrl = URL.createObjectURL(file);
    if (file.type.startsWith('image/')) {
        const img = new Image();
        img.src = fileUrl;
        img.onload = () => {
            drawImageOnCanvas(img);
            URL.revokeObjectURL(fileUrl);
        };
    } else if (file.type === 'application/pdf') {
        renderPDF(fileUrl);
    } else {
        alert('지원하지 않는 파일 형식입니다. JPG 또는 PDF 파일을 선택해주세요.');
        toolsContainer.style.display = 'none';
        nameButtonsContainer.style.display = 'none';
    }
});

penButton.addEventListener('click', () => {
    currentTool = 'pen';
    setActiveButton(penButton);
});

checkButton.addEventListener('click', () => {
    currentTool = 'check';
    setActiveButton(checkButton);
});

nameButtons.forEach(button => {
    button.addEventListener('click', () => {
        currentTool = 'text';
        currentText = button.textContent;
        setActiveButton(button);
    });
});

applyTextButton.addEventListener('click', () => {
    currentTool = 'text';
    currentText = customTextInput.value.trim();
    setActiveButton(applyTextButton);
});

undoButton.addEventListener('click', () => {
    // 모든 캔버스를 순회하며 undo를 적용
    pageCanvases.forEach(canvas => {
        const pageId = canvas.parentElement.dataset.pageId;
        const ctx = canvas.getContext('2d');

        if (history[pageId] && history[pageId].length > 1) {
            history[pageId].pop();
            const lastState = history[pageId][history[pageId].length - 1];
            const img = new Image();
            img.onload = function() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
            };
            img.src = lastState;
        } else if (history[pageId] && history[pageId].length === 1) {
            history[pageId].pop();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    });
});

saveButton.addEventListener('click', () => {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    let totalHeight = 0;
    let maxWidth = 0;

    const pageContainers = document.querySelectorAll('.page-container');
    if (pageContainers.length === 0) return;

    pageContainers.forEach(container => {
        const bgCanvas = container.querySelector('.backgroundCanvas');
        const drawCanvas = container.querySelector('.drawingCanvas');
        if (bgCanvas) {
            totalHeight += bgCanvas.height;
            if (bgCanvas.width > maxWidth) {
                maxWidth = bgCanvas.width;
            }
        }
    });

    tempCanvas.width = maxWidth;
    tempCanvas.height = totalHeight;

    let currentY = 0;
    pageContainers.forEach(container => {
        const bgCanvas = container.querySelector('.backgroundCanvas');
        const drawCanvas = container.querySelector('.drawingCanvas');
        
        if (bgCanvas && drawCanvas) {
            tempCtx.drawImage(bgCanvas, 0, currentY, bgCanvas.width, bgCanvas.height);
            tempCtx.drawImage(drawCanvas, 0, currentY, drawCanvas.width, drawCanvas.height);
            currentY += bgCanvas.height;
        }
    });

    const image = tempCanvas.toDataURL('image/jpeg', 1.0);
    const link = document.createElement('a');
    const fileName = fileNameInput.value.trim() || '인포유_미래전략_결과물';
    link.download = fileName + '.jpg';
    link.href = image;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

homeButton.addEventListener('click', () => {
    window.location.reload();
});