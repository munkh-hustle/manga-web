// script.js - Fixed image display for vertical manga
let mangaLibrary = {
    mangas: []
};
let currentState = 'manga-list';
let currentManga = null;
let currentChapter = null;
let currentPage = 0;
let readingDirection = 'ltr';
let isFullscreen = false;

const sections = {
    mangaList: document.getElementById('manga-list-section'),
    chapters: document.getElementById('chapters-section'),
    reader: document.getElementById('reader-section')
};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadMangaData();
        setupEventListeners();
        loadUnlockedChapters();
        
        // Auto-set dark theme
        document.body.classList.add('dark-theme');
        
        if (localStorage.getItem('readingDirection')) {
            readingDirection = localStorage.getItem('readingDirection');
            setReadingDirection(readingDirection);
        }
    } catch (error) {
        console.error('Failed to load manga data:', error);
        showNotification('Failed to load manga data. Please refresh the page.', 'error');
        loadFallbackData();
    }
});

// Add scroll to top functionality
document.addEventListener('DOMContentLoaded', () => {
    const scrollTopBtn = document.getElementById('scroll-top-btn');
    
    if (scrollTopBtn) {
        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        
        // Show/hide button based on scroll position
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                scrollTopBtn.style.display = 'flex';
            } else {
                scrollTopBtn.style.display = 'none';
            }
        });
        
        // Initialize hidden
        scrollTopBtn.style.display = 'none';
    }
});

async function loadMangaData() {
    try {
        const response = await fetch('data/manga-data.json');
        if (!response.ok) throw new Error('Failed to load manga data');
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
                            "https://lh3.googleusercontent.com/pw/AP1GczOwlELI0cpiiG9XIjzTaXMWFjR5Wab6N8b31Lf8YO6bPTKfESOtIFEgWgD4mbk-YhVXQ3RHUfa09F-ei9yAQ4K_rVvHY7MtUN43Ay5UvHLJupduF9VljSB_7pph8FniqfMqVmQVL5B4YWjSz0Cg3Rk=s0",
                            "https://lh3.googleusercontent.com/pw/AP1GczONEzhK9K5--5S-77rNHgNcvGXtcJHdNKoCGoGPAHLUrQvJUkHCziCtCT5lmwOIrAJgWYQST_dAHadB0_4XKNGjo4vFIK1x6MVCozJHIvdv741Rt93iae8CkXnTiCxoZp0gS9qyR2X-wYAQuI_zlXc=s0"
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
    
    document.getElementById('current-manga-title').textContent = manga.title;
    document.getElementById('manga-description').textContent = manga.description;
    document.getElementById('back-to-manga').style.display = 'flex';
    
    sections.mangaList.style.display = 'none';
    sections.chapters.style.display = 'block';
    sections.reader.style.display = 'none';
    
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
    
    const unlocked = JSON.parse(localStorage.getItem(`unlockedChapters_${mangaId}`) || '[]');
    if (chapter.locked && !unlocked.includes(chapterId)) {
        showNotification('This chapter is still locked!', 'error');
        return;
    }
    
    if (!chapter.pages || chapter.pages.length === 0) {
        showNotification('No pages available for this chapter', 'error');
        return;
    }
    
    currentManga = manga;
    currentChapter = chapter;
    currentPage = 0;
    currentState = 'reader';
    
    document.getElementById('chapter-title').textContent = `${chapter.number}: ${chapter.title}`;
    document.getElementById('back-to-manga').style.display = 'flex';
    
    sections.mangaList.style.display = 'none';
    sections.chapters.style.display = 'none';
    sections.reader.style.display = 'block';
    
    loadChapterPages(chapter.pages);
}

function loadChapterPages(pages) {
    const mangaPages = document.getElementById('manga-pages');
    mangaPages.innerHTML = '';
    
    // Convert pages object to array if needed
    let pageArray;
    if (Array.isArray(pages)) {
        pageArray = pages;
    } else if (typeof pages === 'object') {
        // Convert object to array sorted by keys
        pageArray = Object.entries(pages)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([key, value]) => value);
    } else {
        pageArray = [];
    }
    
    let loadedCount = 0;
    const totalPages = pageArray.length;
    
    // Add a class to indicate loading is happening
    mangaPages.classList.add('loading-pages');
    
    pageArray.forEach((page, index) => {
        // Create container for each page
        const pageContainer = document.createElement('div');
        pageContainer.className = 'manga-page-container';
        pageContainer.style.margin = '0';
        pageContainer.style.padding = '0';
        pageContainer.style.minHeight = 'auto';
        
        const img = new Image();
        img.src = page;
        img.alt = `Page ${index + 1}`;
        img.className = 'manga-page';
        img.dataset.index = index;
        img.loading = 'lazy';
        img.style.margin = '0 auto';
        img.style.display = 'block';
        
        img.onload = function() {
            loadedCount++;
            
            // Auto-detect image orientation and apply appropriate class
            if (this.naturalWidth > this.naturalHeight) {
                // Horizontal image (width > height)
                this.classList.add('horizontal');
                
                // For horizontal images, set appropriate max dimensions
                this.style.maxWidth = '100%';
                this.style.maxHeight = '85vh';
                this.style.width = 'auto';
                this.style.height = 'auto';
            } else {
                // Vertical image (height > width)
                this.classList.add('vertical');
                
                // For vertical manga pages, we want them to be readable
                // Calculate appropriate width while maintaining aspect ratio
                const aspectRatio = this.naturalHeight / this.naturalWidth;
                
                if (aspectRatio > 10) {
                    // Extremely tall image (like 720x12000)
                    this.style.maxWidth = '800px';
                    this.style.width = '100%';
                    this.style.height = 'auto';
                } else if (aspectRatio > 5) {
                    // Very tall image
                    this.style.maxWidth = '700px';
                    this.style.width = '100%';
                    this.style.height = 'auto';
                } else {
                    // Normal vertical image
                    this.style.maxWidth = '600px';
                    this.style.width = '100%';
                    this.style.height = 'auto';
                }
            }
            
            // Ensure image doesn't have any problematic margins
            this.style.marginTop = '0';
            this.style.marginBottom = '0';
            this.style.padding = '0';
            
            applyReadingDirection();
            
            if (loadedCount === totalPages) {
                mangaPages.classList.remove('loading-pages');
                updatePageInfo();
                scrollToPage();
            }
        };
        
        img.onerror = function() {
            loadedCount++;
            const errorDiv = document.createElement('div');
            errorDiv.className = 'image-error';
            errorDiv.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load page ${index + 1}</p>
            `;
            pageContainer.appendChild(errorDiv);
            mangaPages.appendChild(pageContainer);
        };
        
        pageContainer.appendChild(img);
        mangaPages.appendChild(pageContainer);
    });
    
    if (pageArray.length === 0) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'image-error';
        errorDiv.innerHTML = `
            <i class="fas fa-book-open"></i>
            <p>No pages available for this chapter</p>
        `;
        mangaPages.appendChild(errorDiv);
    }
    
    // Update the total pages for this chapter
    if (currentChapter) {
        currentChapter.totalPages = pageArray.length;
    }
}

function applyReadingDirection() {
    const mangaPages = document.getElementById('manga-pages');
    if (readingDirection === 'rtl') {
        mangaPages.style.flexDirection = 'column-reverse';
    } else {
        mangaPages.style.flexDirection = 'column';
    }
}

function toggleFullscreen() {
    const reader = document.getElementById('reader-section');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    
    if (!isFullscreen) {
        reader.classList.add('fullscreen');
        fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
        fullscreenBtn.title = 'Exit Fullscreen';
        isFullscreen = true;
        document.querySelector('header').style.display = 'none';
        document.querySelector('footer').style.display = 'none';
        
        // Adjust images for fullscreen
        setTimeout(() => {
            const images = document.querySelectorAll('.manga-page');
            images.forEach(img => {
                if (img.classList.contains('vertical')) {
                    img.style.maxWidth = '90vw';
                } else {
                    img.style.maxHeight = '90vh';
                }
            });
        }, 100);
    } else {
        reader.classList.remove('fullscreen');
        fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
        fullscreenBtn.title = 'Enter Fullscreen';
        isFullscreen = false;
        document.querySelector('header').style.display = 'block';
        document.querySelector('footer').style.display = 'block';
        
        // Reset image sizes
        setTimeout(() => {
            const images = document.querySelectorAll('.manga-page');
            images.forEach(img => {
                if (img.classList.contains('vertical')) {
                    img.style.maxWidth = '800px';
                } else {
                    img.style.maxHeight = '85vh';
                }
            });
        }, 100);
    }
}

function handleKeyboardShortcuts(e) {
    if (currentState !== 'reader') return;
    
    switch (e.key) {
        case 'ArrowLeft':
            previousPage();
            e.preventDefault();
            break;
        case 'ArrowRight':
            nextPage();
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
        case 'Escape':
            if (isFullscreen) toggleFullscreen();
            break;
        case ' ':
            // Spacebar toggles between next page and previous page
            e.preventDefault();
            if (readingDirection === 'ltr') {
                nextPage();
            } else {
                previousPage();
            }
            break;
    }
}

function updatePageInfo() {
    if (!currentChapter || !currentChapter.pages) return;
    
    // Get the total number of pages
    let totalPages;
    if (Array.isArray(currentChapter.pages)) {
        totalPages = currentChapter.pages.length;
    } else if (typeof currentChapter.pages === 'object') {
        totalPages = Object.keys(currentChapter.pages).length;
    } else {
        totalPages = 0;
    }
    
    // Create or update page counter
    let pageCounter = document.querySelector('.page-counter');
    if (!pageCounter) {
        pageCounter = document.createElement('div');
        pageCounter.className = 'page-counter';
        document.body.appendChild(pageCounter);
    }
    
    pageCounter.textContent = `Page ${currentPage + 1} of ${totalPages}`;
    
    const hasPrevChapter = currentChapter.id > 1;
    const hasNextChapter = currentChapter.id < currentManga.chaptersList.length;
    
    document.getElementById('prev-chapter').disabled = !hasPrevChapter;
    document.getElementById('next-chapter').disabled = !hasNextChapter;
    document.getElementById('prev-chapter-bottom').disabled = !hasPrevChapter;
    document.getElementById('next-chapter-bottom').disabled = !hasNextChapter;
}


function scrollToPage() {
    const mangaPages = document.getElementById('manga-pages');
    if (!mangaPages) return;
    
    const pageContainers = mangaPages.querySelectorAll('.manga-page-container');
    if (pageContainers.length > currentPage) {
        const pageContainer = pageContainers[currentPage];
        const container = mangaPages;
        const containerHeight = container.clientHeight;
        const pageTop = pageContainer.offsetTop;
        const pageHeight = pageContainer.clientHeight;
        const scrollPosition = pageTop - (containerHeight / 2) + (pageHeight / 2);
        
        if (container.scrollTo) {
            container.scrollTo({ top: scrollPosition, behavior: 'smooth' });
        } else {
            container.scrollTop = scrollPosition;
        }
    }
}

function setReadingDirection(direction) {
    readingDirection = direction;
    localStorage.setItem('readingDirection', direction);
    
    document.getElementById('direction-ltr').classList.toggle('active', direction === 'ltr');
    document.getElementById('direction-rtl').classList.toggle('active', direction === 'rtl');
    
    applyReadingDirection();
}

function goBackToManga() {
    currentState = 'manga-list';
    document.getElementById('back-to-manga').style.display = 'none';
    sections.mangaList.style.display = 'block';
    sections.chapters.style.display = 'none';
    sections.reader.style.display = 'none';
}

function goBackToChapters() {
    currentState = 'chapters';
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
    
    for (const manga of mangaLibrary.mangas) {
        for (const chapter of manga.chaptersList) {
            if (chapter.code === code) {
                const unlocked = JSON.parse(localStorage.getItem(`unlockedChapters_${manga.id}`) || '[]');
                if (!unlocked.includes(chapter.id)) {
                    unlocked.push(chapter.id);
                    localStorage.setItem(`unlockedChapters_${manga.id}`, JSON.stringify(unlocked));
                }
                
                found = true;
                
                if (currentManga && currentManga.id === manga.id) {
                    loadChapters(manga.id);
                }
                
                loadMangaList();
                showNotification(`${chapter.number} unlocked successfully!`, 'success');
                codeInput.value = '';
                
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
    document.getElementById('unlock-btn').addEventListener('click', unlockChapter);
    
    document.getElementById('back-to-manga').addEventListener('click', () => {
        if (currentState === 'reader') goBackToChapters();
        else if (currentState === 'chapters') goBackToManga();
    });
    
    // Top chapter controls
    document.getElementById('prev-chapter').addEventListener('click', previousChapter);
    document.getElementById('next-chapter').addEventListener('click', nextChapter);
    
    // Bottom chapter controls
    document.getElementById('prev-chapter-bottom').addEventListener('click', previousChapter);
    document.getElementById('next-chapter-bottom').addEventListener('click', nextChapter);
    
    document.getElementById('close-reader').addEventListener('click', goBackToChapters);
    
    document.getElementById('direction-ltr').addEventListener('click', () => setReadingDirection('ltr'));
    document.getElementById('direction-rtl').addEventListener('click', () => setReadingDirection('rtl'));
    
    document.getElementById('fullscreen-btn').addEventListener('click', toggleFullscreen);
    
    document.getElementById('code-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') unlockChapter();
    });
    
    const searchInput = document.getElementById('manga-search');
    if (searchInput) {
        searchInput.addEventListener('input', searchManga);
    }
    
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Click on manga page to navigate
    document.addEventListener('click', (e) => {
        if (currentState !== 'reader') return;
        
        const mangaPage = e.target.closest('.manga-page');
        if (mangaPage) {
            const clickX = e.clientX;
            const windowWidth = window.innerWidth;
            
            if (clickX < windowWidth / 2) {
                // Clicked left side - previous page
                previousPage();
            } else {
                // Clicked right side - next page
                nextPage();
            }
        }
    });
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
    
    setTimeout(() => {
        notification.classList.add('show');
        notification.style.backgroundColor = type === 'error' ? '#ff4757' : 
                                          type === 'success' ? '#2ed573' : '#3742fa';
    }, 10);
    
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

// Export for debugging
if (typeof window !== 'undefined') {
    window.mangaApp = { mangaLibrary };
}