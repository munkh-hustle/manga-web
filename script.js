// App State
let mangaLibrary = {
    mangas: []
};
let currentState = 'manga-list';
let currentManga = null;
let currentChapter = null;
let currentPage = 0;
let zoomLevel = 1;
let viewMode = 'single';
let imageFitMode = 'width'; // 'width', 'height', or 'both'
let readingDirection = 'ltr'; // 'ltr' or 'rtl'
let isFullscreen = false;

// DOM Elements
const sections = {
    mangaList: document.getElementById('manga-list-section'),
    chapters: document.getElementById('chapters-section'),
    reader: document.getElementById('reader-section')
};

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadMangaData();
        setupEventListeners();
        loadUnlockedChapters();
        initializeReaderSettings(); // Add this line
        
        // Check for saved theme
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-theme');
            updateThemeButton();
        }
    } catch (error) {
        console.error('Failed to load manga data:', error);
        showNotification('Failed to load manga data. Please refresh the page.', 'error');
        loadFallbackData();
    }
});

async function loadMangaData() {
    try {
        const response = await fetch('data/manga-data.json');
        if (!response.ok) {
            throw new Error('Failed to load manga data');
        }
        const data = await response.json();
        mangaLibrary = data;
        loadMangaList();
    } catch (error) {
        throw error;
    }
}

function loadFallbackData() {
    mangaLibrary = {
        mangas: [
            {
                id: 1,
                title: "Tears on a Withered Flower",
                author: "Author Unknown",
                description: "A poignant story about love, loss, and redemption.",
                cover: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop",
                status: "Ongoing",
                chapters: 10,
                lastUpdated: "2024-01-25",
                chaptersList: [
                    {
                        id: 1,
                        title: "The Withered Blossom",
                        number: "Chapter 1",
                        locked: false,
                        pages: [
                            "https://lh3.googleusercontent.com/pw/AP1GczOwlELI0cpiiG9XIjzTaXMWFjR5Wab6N8b31Lf8YO6bPTKfESOtIFEgWgD4mbk-YhVXQ3RHUfa09F-ei9yAQ4K_rVvHY7MtUN43Ay5UvHLJupduF9VljSB_7pph8FniqfMqVmQVL5B4YWjSz0Cg3Rk=w53-h915-s-no-gm?authuser=0",
                            "https://lh3.googleusercontent.com/pw/AP1GczONEzhK9K5--5S-77rNHgNcvGXtcJHdNKoCGoGPAHLUrQvJUkHCziCtCT5lmwOIrAJgWYQST_dAHadB0_4XKNGjo4vFIK1x6MVCozJHIvdv741Rt93iae8CkXnTiCxoZp0gS9qyR2X-wYAQuI_zlXc=w55-h915-s-no-gm?authuser=0"
                        ],
                        date: "2024-01-01",
                        code: null
                    }
                ]
            }
        ]
    };
    loadMangaList();
    showNotification('Loaded fallback data', 'info');
}

function loadMangaList() {
    const mangaGrid = document.getElementById('manga-grid');
    if (!mangaGrid) return;
    
    mangaGrid.innerHTML = '';
    
    if (mangaLibrary.mangas.length === 0) {
        mangaGrid.innerHTML = `
            <div class="no-manga">
                <i class="fas fa-book-open fa-3x"></i>
                <h3>No manga available</h3>
                <p>Check back later for updates!</p>
            </div>
        `;
        return;
    }
    
    mangaLibrary.mangas.forEach(manga => {
        const unlockedChapters = getUnlockedChaptersCount(manga.id);
        
        const mangaCard = document.createElement('div');
        mangaCard.className = 'manga-card';
        mangaCard.dataset.id = manga.id;
        
        mangaCard.innerHTML = `
            <img src="${manga.cover}" alt="${manga.title}" class="manga-cover" loading="lazy">
            <div class="manga-info">
                <div class="manga-title">
                    ${manga.title}
                    <span class="chapter-count">${unlockedChapters}/${manga.chaptersList.length}</span>
                </div>
                <div class="manga-author">
                    <i class="fas fa-user-pen"></i> ${manga.author}
                </div>
                <div class="manga-status status-${manga.status.toLowerCase()}">
                    ${manga.status}
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${(unlockedChapters / manga.chaptersList.length) * 100}%"></div>
                </div>
            </div>
        `;
        
        mangaCard.addEventListener('click', () => openManga(manga.id));
        mangaGrid.appendChild(mangaCard);
    });
}

function getUnlockedChaptersCount(mangaId) {
    const manga = mangaLibrary.mangas.find(m => m.id === mangaId);
    if (!manga) return 0;
    
    const unlocked = JSON.parse(localStorage.getItem(`unlockedChapters_${mangaId}`) || '[]');
    return manga.chaptersList.filter(ch => !ch.locked || unlocked.includes(ch.id)).length;
}

function openManga(mangaId) {
    const manga = mangaLibrary.mangas.find(m => m.id === mangaId);
    if (!manga) {
        showNotification('Manga not found', 'error');
        return;
    }
    
    currentManga = manga;
    currentState = 'chapters';
    
    // Update UI
    document.getElementById('current-manga-title').textContent = manga.title;
    document.getElementById('manga-description').textContent = manga.description;
    document.getElementById('back-to-manga').style.display = 'flex';
    
    // Show/hide sections
    sections.mangaList.style.display = 'none';
    sections.chapters.style.display = 'block';
    sections.reader.style.display = 'none';
    
    // Load chapters
    loadChapters(manga.id);
}

function loadChapters(mangaId) {
    const manga = mangaLibrary.mangas.find(m => m.id === mangaId);
    if (!manga) return;
    
    const chaptersList = document.getElementById('chapters-list');
    chaptersList.innerHTML = '';
    
    const unlocked = JSON.parse(localStorage.getItem(`unlockedChapters_${mangaId}`) || '[]');
    
    manga.chaptersList.forEach(chapter => {
        const isUnlocked = !chapter.locked || unlocked.includes(chapter.id);
        
        const chapterCard = document.createElement('div');
        chapterCard.className = `chapter-card ${isUnlocked ? 'unlocked' : 'locked'}`;
        chapterCard.dataset.id = chapter.id;
        
        chapterCard.innerHTML = `
            <div class="chapter-number">
                ${chapter.number}
                <span class="chapter-date">${formatDate(chapter.date)}</span>
            </div>
            <div class="chapter-title">${chapter.title}</div>
            <div class="chapter-status ${isUnlocked ? 'unlocked' : 'locked'}">
                <i class="fas ${isUnlocked ? 'fa-unlock' : 'fa-lock'}"></i>
                ${isUnlocked ? 'Ready to read' : 'Locked - Enter code to unlock'}
            </div>
            ${!isUnlocked ? '<div class="lock-icon"><i class="fas fa-lock"></i></div>' : ''}
        `;
        
        if (isUnlocked) {
            chapterCard.addEventListener('click', () => openChapter(manga.id, chapter.id));
        } else {
            chapterCard.addEventListener('click', () => {
                showNotification('This chapter is locked. Enter the code to unlock.', 'error');
            });
        }
        
        chaptersList.appendChild(chapterCard);
    });
}

function openChapter(mangaId, chapterId) {
    const manga = mangaLibrary.mangas.find(m => m.id === mangaId);
    if (!manga) return;
    
    const chapter = manga.chaptersList.find(c => c.id === chapterId);
    if (!chapter) return;
    
    // Check if chapter is unlocked
    const unlocked = JSON.parse(localStorage.getItem(`unlockedChapters_${mangaId}`) || '[]');
    if (chapter.locked && !unlocked.includes(chapterId)) {
        showNotification('This chapter is still locked!', 'error');
        return;
    }
    
    // Check if chapter has pages
    if (!chapter.pages || chapter.pages.length === 0) {
        // Try to load from sample pages
        const key = `${mangaId}_${chapterId}`;
        if (samplePages[key]) {
            chapter.pages = samplePages[key];
        } else {
            showNotification('No pages available for this chapter', 'error');
            return;
        }
    }
    
    currentManga = manga;
    currentChapter = chapter;
    currentPage = 0;
    currentState = 'reader';
    zoomLevel = 1;
    
    // Update UI
    document.getElementById('chapter-title').textContent = `${chapter.number}: ${chapter.title}`;
    document.getElementById('back-to-manga').style.display = 'flex';
    
    // Show/hide sections
    sections.mangaList.style.display = 'none';
    sections.chapters.style.display = 'none';
    sections.reader.style.display = 'block';
    
    // Load pages
    loadChapterPages(chapter.pages);
}

function loadChapterPages(pages) {
    const mangaPages = document.getElementById('manga-pages');
    mangaPages.innerHTML = '';
    
    // Create loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'image-loading';
    mangaPages.appendChild(loadingDiv);
    
    let loadedCount = 0;
    
    pages.forEach((page, index) => {
        const img = new Image();
        img.src = page;
        img.alt = `Page ${index + 1}`;
        img.className = 'manga-page';
        img.dataset.index = index;
        img.loading = 'eager';
        
        // Auto-detect and apply orientation class
        img.onload = function() {
            loadedCount++;
            
            // Remove loading indicator when first image loads
            if (loadedCount === 1) {
                const loadingDiv = mangaPages.querySelector('.image-loading');
                if (loadingDiv) loadingDiv.remove();
            }
            
            // Auto-detect orientation
            if (this.naturalWidth > this.naturalHeight) {
                this.classList.add('horizontal');
            } else {
                this.classList.add('vertical');
            }
            
            // Apply current fit mode
            applyImageFit(this);
            
            // Update button states when all images loaded
            if (loadedCount === pages.length) {
                updatePageInfo();
                scrollToPage();
            }
        };
        
        img.onerror = function() {
            loadedCount++;
            
            // Remove loading indicator if it exists
            const loadingDiv = mangaPages.querySelector('.image-loading');
            if (loadingDiv) loadingDiv.remove();
            
            // Replace with error state
            const errorDiv = document.createElement('div');
            errorDiv.className = 'image-error';
            errorDiv.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load page ${index + 1}</p>
                <button onclick="retryLoadImage(${currentManga.id}, ${currentChapter.id}, ${index})">Retry</button>
            `;
            mangaPages.appendChild(errorDiv);
        };
        
        mangaPages.appendChild(img);
    });
    
    // If no images to load, remove loading indicator
    if (pages.length === 0) {
        const loadingDiv = mangaPages.querySelector('.image-loading');
        if (loadingDiv) loadingDiv.remove();
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'image-error';
        errorDiv.innerHTML = `
            <i class="fas fa-book-open"></i>
            <p>No pages available for this chapter</p>
        `;
        mangaPages.appendChild(errorDiv);
    }
}

function applyImageFit(imgElement) {
    switch (imageFitMode) {
        case 'width':
            imgElement.style.maxWidth = '100%';
            imgElement.style.maxHeight = 'none';
            imgElement.style.width = 'auto';
            imgElement.style.height = 'auto';
            break;
        case 'height':
            imgElement.style.maxWidth = 'none';
            imgElement.style.maxHeight = '90vh';
            imgElement.style.width = 'auto';
            imgElement.style.height = 'auto';
            break;
        case 'both':
            imgElement.style.maxWidth = '100%';
            imgElement.style.maxHeight = '90vh';
            imgElement.style.width = 'auto';
            imgElement.style.height = 'auto';
            imgElement.style.objectFit = 'contain';
            break;
    }
}

// Set image fit mode
function setImageFit(mode) {
    imageFitMode = mode;
    localStorage.setItem('imageFitMode', mode);
    
    // Update button states
    document.getElementById('fit-width').classList.toggle('active', mode === 'width');
    document.getElementById('fit-height').classList.toggle('active', mode === 'height');
    document.getElementById('fit-both').classList.toggle('active', mode === 'both');
    
    // Apply to all images
    const images = document.querySelectorAll('.manga-page');
    images.forEach(img => {
        if (img.complete) {
            applyImageFit(img);
        }
    });
}

// Set reading direction
function setReadingDirection(direction) {
    readingDirection = direction;
    localStorage.setItem('readingDirection', direction);
    
    // Update button states
    document.getElementById('direction-ltr').classList.toggle('active', direction === 'ltr');
    document.getElementById('direction-rtl').classList.toggle('active', direction === 'rtl');
    
    // Apply to manga pages container
    const mangaPages = document.getElementById('manga-pages');
    if (direction === 'rtl') {
        mangaPages.style.flexDirection = 'column-reverse';
    } else {
        mangaPages.style.flexDirection = 'column';
    }
}

// Toggle fullscreen mode
function toggleFullscreen() {
    const reader = document.getElementById('reader-section');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    
    if (!isFullscreen) {
        // Enter fullscreen
        reader.classList.add('fullscreen');
        fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
        fullscreenBtn.title = 'Exit Fullscreen';
        isFullscreen = true;
        
        // Hide other elements
        document.querySelector('header').style.display = 'none';
        document.querySelector('footer').style.display = 'none';
    } else {
        // Exit fullscreen
        reader.classList.remove('fullscreen');
        fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
        fullscreenBtn.title = 'Enter Fullscreen';
        isFullscreen = false;
        
        // Show other elements
        document.querySelector('header').style.display = 'block';
        document.querySelector('footer').style.display = 'block';
    }
}

// Keyboard shortcuts
function handleKeyboardShortcuts(e) {
    // Only handle shortcuts in reader mode
    if (currentState !== 'reader') return;
    
    switch (e.key) {
        case 'ArrowLeft':
            if (readingDirection === 'ltr') {
                previousPage();
            } else {
                nextPage();
            }
            e.preventDefault();
            break;
        case 'ArrowRight':
            if (readingDirection === 'ltr') {
                nextPage();
            } else {
                previousPage();
            }
            e.preventDefault();
            break;
        case 'ArrowUp':
            previousChapter();
            e.preventDefault();
            break;
        case 'ArrowDown':
            nextChapter();
            e.preventDefault();
            break;
        case 'f':
        case 'F':
            toggleFullscreen();
            e.preventDefault();
            break;
        case '+':
        case '=':
            adjustZoom(0.1);
            e.preventDefault();
            break;
        case '-':
        case '_':
            adjustZoom(-0.1);
            e.preventDefault();
            break;
        case '0':
            resetZoom();
            e.preventDefault();
            break;
        case 'Escape':
            if (isFullscreen) {
                toggleFullscreen();
            }
            break;
    }
}

// Retry loading failed image
function retryLoadImage(mangaId, chapterId, pageIndex) {
    const manga = mangaLibrary.mangas.find(m => m.id === mangaId);
    if (!manga) return;
    
    const chapter = manga.chaptersList.find(c => c.id === chapterId);
    if (!chapter || !chapter.pages[pageIndex]) return;
    
    // Remove error div
    const errorDiv = document.querySelector('.image-error');
    if (errorDiv) errorDiv.remove();
    
    // Create new image
    const img = new Image();
    img.src = chapter.pages[pageIndex];
    img.alt = `Page ${pageIndex + 1}`;
    img.className = 'manga-page';
    img.dataset.index = pageIndex;
    
    img.onload = function() {
        if (this.naturalWidth > this.naturalHeight) {
            this.classList.add('horizontal');
        } else {
            this.classList.add('vertical');
        }
        applyImageFit(this);
    };
    
    img.onerror = function() {
        const mangaPages = document.getElementById('manga-pages');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'image-error';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <p>Failed to load page ${pageIndex + 1}</p>
            <button onclick="retryLoadImage(${mangaId}, ${chapterId}, ${pageIndex})">Retry</button>
        `;
        mangaPages.appendChild(errorDiv);
    };
    
    const mangaPages = document.getElementById('manga-pages');
    mangaPages.appendChild(img);
}


function updatePageInfo() {
    if (!currentChapter || !currentChapter.pages) return;
    
    document.getElementById('page-info').textContent = 
        `Page ${currentPage + 1} of ${currentChapter.pages.length}`;
    
    // Update button states
    const hasPrevChapter = currentChapter.id > 1;
    const hasNextChapter = currentChapter.id < currentManga.chaptersList.length;
    
    document.getElementById('prev-chapter').disabled = !hasPrevChapter;
    document.getElementById('next-chapter').disabled = !hasNextChapter;
    document.getElementById('prev-btn').disabled = currentPage === 0;
    document.getElementById('next-btn').disabled = currentPage === currentChapter.pages.length - 1;
}

function scrollToPage() {
    const mangaPages = document.getElementById('manga-pages');
    if (!mangaPages) return;
    
    const pageElement = mangaPages.querySelector(`.manga-page[data-index="${currentPage}"]`);
    if (pageElement) {
        // Calculate scroll position based on reading direction
        const container = document.querySelector('.reader-container') || mangaPages;
        const containerHeight = container.clientHeight;
        const pageTop = pageElement.offsetTop;
        const pageHeight = pageElement.clientHeight;
        
        // Center the page vertically
        const scrollPosition = pageTop - (containerHeight / 2) + (pageHeight / 2);
        
        if (container.scrollTo) {
            container.scrollTo({
                top: scrollPosition,
                behavior: 'smooth'
            });
        } else {
            container.scrollTop = scrollPosition;
        }
    }
}

function initializeReaderSettings() {
    // Load saved settings from localStorage
    const savedFitMode = localStorage.getItem('imageFitMode');
    const savedDirection = localStorage.getItem('readingDirection');
    
    if (savedFitMode) {
        imageFitMode = savedFitMode;
    }
    
    if (savedDirection) {
        readingDirection = savedDirection;
    }
    
    // Update UI
    setImageFit(imageFitMode);
    setReadingDirection(readingDirection);
}

function saveReaderSettings() {
    localStorage.setItem('imageFitMode', imageFitMode);
    localStorage.setItem('readingDirection', readingDirection);
}


function goBackToManga() {
    currentState = 'manga-list';
    
    // Update UI
    document.getElementById('back-to-manga').style.display = 'none';
    
    // Show/hide sections
    sections.mangaList.style.display = 'block';
    sections.chapters.style.display = 'none';
    sections.reader.style.display = 'none';
}

function goBackToChapters() {
    currentState = 'chapters';
    
    // Show/hide sections
    sections.mangaList.style.display = 'none';
    sections.chapters.style.display = 'block';
    sections.reader.style.display = 'none';
}

function unlockChapter() {
    const codeInput = document.getElementById('code-input');
    const code = codeInput.value.trim().toUpperCase();
    
    if (!code) {
        showNotification('Please enter a code', 'error');
        return;
    }
    
    let found = false;
    
    // Search through all mangas and chapters
    for (const manga of mangaLibrary.mangas) {
        for (const chapter of manga.chaptersList) {
            if (chapter.code === code) {
                // Unlock the chapter
                const unlocked = JSON.parse(localStorage.getItem(`unlockedChapters_${manga.id}`) || '[]');
                if (!unlocked.includes(chapter.id)) {
                    unlocked.push(chapter.id);
                    localStorage.setItem(`unlockedChapters_${manga.id}`, JSON.stringify(unlocked));
                }
                
                found = true;
                
                // If we're currently viewing this manga's chapters, reload them
                if (currentManga && currentManga.id === manga.id) {
                    loadChapters(manga.id);
                }
                
                // Reload manga list to update progress
                loadMangaList();
                
                showNotification(`${chapter.number} unlocked successfully!`, 'success');
                codeInput.value = '';
                
                // Auto-open the unlocked chapter if we're in its manga
                if (currentManga && currentManga.id === manga.id) {
                    setTimeout(() => openChapter(manga.id, chapter.id), 500);
                }
                
                break;
            }
        }
        if (found) break;
    }
    
    if (!found) {
        showNotification('Invalid code. Please try again.', 'error');
    }
}

function loadUnlockedChapters() {
    mangaLibrary.mangas.forEach(manga => {
        const unlocked = JSON.parse(localStorage.getItem(`unlockedChapters_${manga.id}`) || '[]');
        manga.chaptersList.forEach(chapter => {
            if (unlocked.includes(chapter.id)) {
                chapter.locked = false;
            }
        });
    });
}

function setupEventListeners() {
    // Unlock button
    document.getElementById('unlock-btn').addEventListener('click', unlockChapter);
    
    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    
    // Back button
    document.getElementById('back-to-manga').addEventListener('click', () => {
        if (currentState === 'reader') {
            goBackToChapters();
        } else if (currentState === 'chapters') {
            goBackToManga();
        }
    });
    
    // Reader controls
    document.getElementById('prev-chapter').addEventListener('click', previousChapter);
    document.getElementById('next-chapter').addEventListener('click', nextChapter);
    document.getElementById('prev-btn').addEventListener('click', previousPage);
    document.getElementById('next-btn').addEventListener('click', nextPage);
    document.getElementById('close-reader').addEventListener('click', goBackToChapters);
    
    // Zoom controls
    document.getElementById('zoom-in').addEventListener('click', () => adjustZoom(0.1));
    document.getElementById('zoom-out').addEventListener('click', () => adjustZoom(-0.1));
    document.getElementById('zoom-reset').addEventListener('click', resetZoom);
    
    // View mode controls
    document.getElementById('single-page').addEventListener('click', () => setViewMode('single'));
    document.getElementById('double-page').addEventListener('click', () => setViewMode('double'));
    
    // Enter key for code input
    document.getElementById('code-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') unlockChapter();
    });
    
    // Search functionality
    const searchInput = document.getElementById('manga-search');
    if (searchInput) {
        searchInput.addEventListener('input', searchManga);
    }

    // Page fit controls
    document.getElementById('fit-width').addEventListener('click', () => setImageFit('width'));
    document.getElementById('fit-height').addEventListener('click', () => setImageFit('height'));
    document.getElementById('fit-both').addEventListener('click', () => setImageFit('both'));
    
    // Reading direction
    document.getElementById('direction-ltr').addEventListener('click', () => setReadingDirection('ltr'));
    document.getElementById('direction-rtl').addEventListener('click', () => setReadingDirection('rtl'));
    
    // Fullscreen toggle
    document.getElementById('fullscreen-btn').addEventListener('click', toggleFullscreen);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

function previousChapter() {
    if (currentChapter && currentChapter.id > 1) {
        const prevChapterId = currentChapter.id - 1;
        openChapter(currentManga.id, prevChapterId);
    }
}

function nextChapter() {
    if (currentChapter && currentChapter.id < currentManga.chaptersList.length) {
        const nextChapterId = currentChapter.id + 1;
        openChapter(currentManga.id, nextChapterId);
    }
}

function previousPage() {
    if (currentPage > 0) {
        currentPage--;
        scrollToPage();
        updatePageInfo();
    }
}

function nextPage() {
    if (currentChapter && currentPage < currentChapter.pages.length - 1) {
        currentPage++;
        scrollToPage();
        updatePageInfo();
    }
}

function adjustZoom(amount) {
    zoomLevel = Math.max(0.5, Math.min(3, zoomLevel + amount));
    const pages = document.querySelectorAll('.manga-page');
    pages.forEach(page => {
        page.style.transform = `scale(${zoomLevel})`;
    });
}

function resetZoom() {
    zoomLevel = 1;
    const pages = document.querySelectorAll('.manga-page');
    pages.forEach(page => {
        page.style.transform = 'scale(1)';
    });
}

function setViewMode(mode) {
    viewMode = mode;
    const mangaPages = document.getElementById('manga-pages');
    
    // Update button states
    document.getElementById('single-page').classList.toggle('active', mode === 'single');
    document.getElementById('double-page').classList.toggle('active', mode === 'double');
    
    // Adjust page display
    if (mode === 'double') {
        mangaPages.style.flexDirection = 'row';
        mangaPages.style.flexWrap = 'wrap';
        mangaPages.style.justifyContent = 'center';
        const pages = document.querySelectorAll('.manga-page');
        pages.forEach(page => {
            page.style.maxWidth = '49%';
            page.style.margin = '5px';
        });
    } else {
        mangaPages.style.flexDirection = 'column';
        const pages = document.querySelectorAll('.manga-page');
        pages.forEach(page => {
            page.style.maxWidth = '100%';
            page.style.margin = '0';
        });
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeButton();
}

function updateThemeButton() {
    const button = document.getElementById('theme-toggle');
    const isDark = document.body.classList.contains('dark-theme');
    button.innerHTML = `<i class="fas ${isDark ? 'fa-sun' : 'fa-moon'}"></i> ${isDark ? 'Light' : 'Dark'} Mode`;
}

function searchManga() {
    const searchTerm = document.getElementById('manga-search').value.toLowerCase();
    const mangaCards = document.querySelectorAll('.manga-card');
    
    mangaCards.forEach(card => {
        const title = card.querySelector('.manga-title').textContent.toLowerCase();
        const author = card.querySelector('.manga-author').textContent.toLowerCase();
        
        if (title.includes(searchTerm) || author.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notification-text');
    
    if (!notification || !notificationText) return;
    
    notificationText.textContent = message;
    notification.className = 'notification';
    
    // Set color based on type
    setTimeout(() => {
        notification.classList.add('show');
        notification.style.backgroundColor = type === 'error' ? '#ff4757' : 
                                          type === 'success' ? '#2ed573' : '#3742fa';
    }, 10);
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
}

// Utility function to add manga dynamically (for testing/development)
function addManga(newManga) {
    if (!mangaLibrary.mangas.some(m => m.id === newManga.id)) {
        mangaLibrary.mangas.push(newManga);
        loadMangaList();
        showNotification(`Added ${newManga.title}`, 'success');
    }
}

// Export for debugging
if (typeof window !== 'undefined') {
    window.mangaApp = {
        loadMangaData,
        addManga,
        mangaLibrary
    };
}