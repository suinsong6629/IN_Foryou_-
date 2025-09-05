import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.mjs';

const fileInput = document.getElementById('fileInput');
const backgroundCanvas = document.getElementById('backgroundCanvas');
const drawingCanvas = document.getElementById('drawingCanvas');
const ctx = drawingCanvas.getContext('2d');
const bgCtx = backgroundCanvas.getContext('2d');

const toolsContainer = document.querySelector('.tools-container');
const nameButtonsContainer = document.querySelector('.name-buttons');

const undoButton = document.getElementById('undoButton');
const saveButton = document.getElementById('saveButton');
const penButton = document.getElementById('penButton');
const checkButton = document.getElementById('checkButton');
const fileNameInput = document.getElementById('fileNameInput');
const homeButton = document.getElementById('homeButton');

const nameButtons = document.querySelectorAll('.name-buttons .name-btn');

// 커스텀 텍스트 관련 요소 가져오기
const customTextInput = document.getElementById('customTextInput');
const applyTextButton = document.getElementById('applyTextButton');

let isDrawing = false;
let lastX = 0;
let lastY = 0;
let history = [];
let step = -1;

const scaleFactor = 2.0;

let currentTool = 'pen';
let currentText = ''; 

ctx.strokeStyle = '#000000';
ctx.lineWidth = 2;
ctx.lineJoin = 'round';
ctx.lineCap = 'round';

function setActiveButton(activeButton) {
    penButton.classList.remove('active');
    checkButton.classList.remove('active');
    nameButtons.forEach(btn => btn.classList.remove('active'));
    applyTextButton.classList.remove('active'); // 적용 버튼도 초기화
    
    activeButton.classList.add('active');
}

function saveState() {
    step++;
    if (step < history.length) {
        history.length = step;
    }
    history.push(drawingCanvas.toDataURL());
}

function drawImageOnCanvas(image) {
    const newWidth = image.width * scaleFactor;
    const newHeight = image.height * scaleFactor;

    backgroundCanvas.width = newWidth;
    backgroundCanvas.height = newHeight;
    drawingCanvas.width = newWidth;
    drawingCanvas.height = newHeight;

    document.querySelector('.canvas-container').style.width = `${newWidth}px`;
    document.querySelector('.canvas-container').style.height = `${newHeight}px`;

    bgCtx.drawImage(image, 0, 0, newWidth, newHeight);

    ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    history = [];
    step = -1;
    saveState();
    
    toolsContainer.style.display = 'block';
    nameButtonsContainer.style.display = 'block'; // 이름 버튼 컨테이너도 보이게 함
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
        try {
            const loadingTask = pdfjsLib.getDocument(fileUrl);
            const pdf = await loadingTask.promise;

            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: scaleFactor });

            backgroundCanvas.width = viewport.width;
            backgroundCanvas.height = viewport.height;
            drawingCanvas.width = viewport.width;
            drawingCanvas.height = viewport.height;

            document.querySelector('.canvas-container').style.width = `${viewport.width}px`;
            document.querySelector('.canvas-container').style.height = `${viewport.height}px`;

            const renderContext = {
                canvasContext: bgCtx,
                viewport: viewport,
            };

            await page.render(renderContext).promise;
            saveState();
            URL.revokeObjectURL(fileUrl);
            
            toolsContainer.style.display = 'block';
            nameButtonsContainer.style.display = 'block';
        } catch (err) {
            console.error('PDF 로드 오류:', err);
            alert('PDF 파일을 로드할 수 없습니다.');
            toolsContainer.style.display = 'none';
            nameButtonsContainer.style.display = 'none';
        }
    } else {
        alert('지원하지 않는 파일 형식입니다. JPG 또는 PDF 파일을 선택해주세요.');
        toolsContainer.style.display = 'none';
        nameButtonsContainer.style.display = 'none';
    }
});

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

drawingCanvas.addEventListener('mouseup', (e) => {
    if (currentTool === 'pen') {
        isDrawing = false;
        saveState();
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
        
        saveState();
    } else if (currentTool === 'text') {
        ctx.font = '24px Arial';
        ctx.fillStyle = '#000000';
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillText(currentText, x, y);
        
        saveState();
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

// 이름 버튼들 클릭 이벤트 리스너
nameButtons.forEach(button => {
    button.addEventListener('click', () => {
        currentTool = 'text';
        currentText = button.textContent;
        setActiveButton(button);
    });
});

// 추가된 코드: 커스텀 텍스트 적용 버튼
applyTextButton.addEventListener('click', () => {
    currentTool = 'text';
    currentText = customTextInput.value.trim(); // 입력된 텍스트를 가져옴
    setActiveButton(applyTextButton); // 적용 버튼을 활성화
});


function undo() {
    if (step > 0) {
        step--;
        const canvasImage = new Image();
        canvasImage.src = history[step];
        canvasImage.onload = () => {
            ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
            ctx.drawImage(canvasImage, 0, 0);
        };
    } else if (step === 0) {
        step--;
        ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    }
}

undoButton.addEventListener('click', undo);

document.addEventListener('keydown', (e) => {
    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        undo();
    }
});

saveButton.addEventListener('click', () => {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = backgroundCanvas.width;
    tempCanvas.height = backgroundCanvas.height;
    
    tempCtx.drawImage(backgroundCanvas, 0, 0);
    tempCtx.drawImage(drawingCanvas, 0, 0);
    
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