// Global variables
let selectedFiles = [];
let pdfOutput = null;
const MAX_FILES = 100;

// DOM elements
const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-upload');
const convertBtn = document.getElementById('convert-btn');
const fileListContainer = document.getElementById('file-list-container');
const fileList = document.getElementById('file-list');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const resultContainer = document.getElementById('result-container');
const downloadBtn = document.getElementById('download-btn');
const clearBtn = document.getElementById('clear-btn');
const resetBtn = document.getElementById('reset-btn');

// Initialize the application
function init() {
    // Setup event listeners
    fileInput.addEventListener('change', handleFileSelect);
    convertBtn.addEventListener('click', convertToPdf);
    clearBtn.addEventListener('click', clearFiles);
    resetBtn.addEventListener('click', resetConverter);
    downloadBtn.addEventListener('click', downloadPdf);
    
    // Setup drag and drop
    setupDragAndDrop();
}

// Setup drag and drop functionality
function setupDragAndDrop() {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropArea.classList.add('active');
    }

    function unhighlight() {
        dropArea.classList.remove('active');
    }

    dropArea.addEventListener('drop', handleDrop, false);
}

// Handle dropped files
function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

// Handle file selection from input
function handleFileSelect(e) {
    const files = e.target.files;
    handleFiles(files);
}

// Process selected files
function handleFiles(files) {
    const validFiles = Array.from(files).filter(file => {
        const fileType = file.type.toLowerCase();
        return fileType === 'image/jpeg' || fileType === 'image/png' || fileType === 'image/jpg';
    });

    if (validFiles.length === 0) {
        alert('Please select only JPG or PNG images.');
        return;
    }

    // Check if adding these files would exceed the limit
    if (selectedFiles.length + validFiles.length > MAX_FILES) {
        alert(`You can only add up to ${MAX_FILES} images. Only the first ${MAX_FILES - selectedFiles.length} will be added.`);
        selectedFiles = [...selectedFiles, ...validFiles.slice(0, MAX_FILES - selectedFiles.length)];
    } else {
        selectedFiles = [...selectedFiles, ...validFiles];
    }

    updateFileList();
    updateConvertButton();
}

// Update the file list display
function updateFileList() {
    if (selectedFiles.length > 0) {
        fileListContainer.classList.remove('hidden');
        fileList.innerHTML = '';
        
        selectedFiles.forEach((file, index) => {
            const li = document.createElement('li');
            li.className = 'file-item';
            
            // File info with thumbnail
            const fileInfo = document.createElement('div');
            fileInfo.className = 'file-info';
            
            const thumbnail = document.createElement('img');
            thumbnail.className = 'file-thumbnail';
            thumbnail.src = URL.createObjectURL(file);
            thumbnail.onload = () => URL.revokeObjectURL(thumbnail.src);
            
            const fileName = document.createElement('span');
            fileName.className = 'file-name';
            fileName.textContent = file.name;
            
            fileInfo.appendChild(thumbnail);
            fileInfo.appendChild(fileName);
            
            // File controls
            const controls = document.createElement('div');
            controls.className = 'file-controls';
            
            if (index > 0) {
                const upBtn = document.createElement('button');
                upBtn.className = 'control-button';
                upBtn.innerHTML = '↑';
                upBtn.title = 'Move up';
                upBtn.onclick = () => moveFile(index, index - 1);
                controls.appendChild(upBtn);
            }
            
            if (index < selectedFiles.length - 1) {
                const downBtn = document.createElement('button');
                downBtn.className = 'control-button';
                downBtn.innerHTML = '↓';
                downBtn.title = 'Move down';
                downBtn.onclick = () => moveFile(index, index + 1);
                controls.appendChild(downBtn);
            }
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'control-button';
            removeBtn.innerHTML = '×';
            removeBtn.title = 'Remove';
            removeBtn.onclick = () => removeFile(index);
            controls.appendChild(removeBtn);
            
            li.appendChild(fileInfo);
            li.appendChild(controls);
            fileList.appendChild(li);
        });
    } else {
        fileListContainer.classList.add('hidden');
    }
}

// Move a file in the list
function moveFile(fromIndex, toIndex) {
    const file = selectedFiles[fromIndex];
    selectedFiles.splice(fromIndex, 1);
    selectedFiles.splice(toIndex, 0, file);
    updateFileList();
}

// Remove a file from the list
function removeFile(index) {
    selectedFiles.splice(index, 1);
    updateFileList();
    updateConvertButton();
}

// Clear all selected files
function clearFiles() {
    selectedFiles = [];
    fileInput.value = '';
    updateFileList();
    updateConvertButton();
}

// Update convert button state
function updateConvertButton() {
    convertBtn.disabled = selectedFiles.length === 0;
}

// Convert images to PDF
async function convertToPdf() {
    if (selectedFiles.length === 0) return;
    
    const pdfName = document.getElementById('pdf-name').value.trim() || 'converted_document';
    
    // Show progress
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = '0%';
    
    // Hide other containers
    fileListContainer.classList.add('hidden');
    convertBtn.disabled = true;
    
    try {
        // Create PDF document
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();
        let currentProgress = 0;
        
        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            
            // Update progress
            currentProgress = Math.round((i / selectedFiles.length) * 100);
            progressBar.style.width = `${currentProgress}%`;
            progressText.textContent = `${currentProgress}%`;
            
            // Process image
            await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const imgData = event.target.result;
                    
                    // Create an image element to get dimensions
                    const img = new Image();
                    img.onload = function() {
                        // Add a new page for each image except the first one
                        if (i > 0) {
                            pdf.addPage();
                        }
                        
                        // Calculate dimensions to fit the page
                        const pdfWidth = pdf.internal.pageSize.getWidth();
                        const pdfHeight = pdf.internal.pageSize.getHeight();
                        
                        let imgWidth = img.width;
                        let imgHeight = img.height;
                        
                        // Scale image to fit the page while maintaining aspect ratio
                        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
                        imgWidth *= ratio;
                        imgHeight *= ratio;
                        
                        // Center the image on the page
                        const x = (pdfWidth - imgWidth) / 2;
                        const y = (pdfHeight - imgHeight) / 2;
                        
                        pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight);
                        resolve();
                    };
                    img.src = imgData;
                };
                reader.readAsDataURL(file);
            });
            
            // Small delay to allow UI to update
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Update progress to 100%
        progressBar.style.width = '100%';
        progressText.textContent = '100%';
        
        // Save the PDF
        pdfOutput = pdf;
        
        // Show result container
        setTimeout(() => {
            progressContainer.classList.add('hidden');
            resultContainer.classList.remove('hidden');
        }, 500);
        
    } catch (error) {
        console.error('Error converting to PDF:', error);
        alert('An error occurred while converting your images. Please try again.');
        progressContainer.classList.add('hidden');
        fileListContainer.classList.remove('hidden');
        convertBtn.disabled = false;
    }
}

// Download the generated PDF
function downloadPdf() {
    if (pdfOutput) {
        try {
            const pdfName = document.getElementById('pdf-name').value.trim() || 'converted_document';
            pdfOutput.save(`${pdfName}.pdf`);
        } catch (error) {
            console.error('Error downloading PDF:', error);
            alert('An error occurred while downloading your PDF. Please try again.');
        }
    } else {
        alert('PDF not ready. Please try converting again.');
    }
}

// Reset the converter
function resetConverter() {
    // Reset all states
    selectedFiles = [];
    pdfOutput = null;
    fileInput.value = '';
    document.getElementById('pdf-name').value = 'converted_document';
    
    // Reset UI
    resultContainer.classList.add('hidden');
    fileListContainer.classList.add('hidden');
    updateConvertButton();
}

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', init);
