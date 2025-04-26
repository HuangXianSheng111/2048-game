class Game2048 {
    constructor() {
        this.grid = Array(16).fill(0);
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('bestScore')) || 0;
        this.gameMessage = document.querySelector('.game-message');
        this.previousGrid = [];
        this.canUndo = false;
        this.touchStartX = null;
        this.touchStartY = null;
        this.isAnimating = false;
        this.useParticles = true; // 添加粒子效果选项
        this.lastTouchDirection = null; // 记录最后滑动方向
        this.touchFeedbackEnabled = true; // 触摸反馈开关
        this.init();
        this.setupEventListeners();
        this.updateBestScore();
        this.addGameIntro();
    }

    init() {
        this.grid = Array(16).fill(0);
        this.score = 0;
        this.previousGrid = [];
        this.canUndo = false;
        document.getElementById('score').textContent = '0';
        this.gameMessage.textContent = '';
        const gameOverElements = document.querySelectorAll('.game-over');
        gameOverElements.forEach(el => el.remove());
        this.addNewTile();
        this.addNewTile();
        this.updateView();
    }

    updateBestScore() {
        document.getElementById('bestScore').textContent = this.bestScore;
    }

    savePreviousState() {
        this.previousGrid = {
            grid: [...this.grid],
            score: this.score
        };
        this.canUndo = true;
    }

    undo() {
        if (!this.canUndo) return;
        this.grid = [...this.previousGrid.grid];
        this.score = this.previousGrid.score;
        document.getElementById('score').textContent = this.score;
        this.updateView();
        this.canUndo = false;
    }

    addGameIntro() {
        if (!localStorage.getItem('gameIntroShown')) {
            const intro = document.createElement('div');
            intro.className = 'game-intro';
            intro.innerHTML = `
                <div class="intro-content">
                    <h2>2048</h2>
                    <p>滑动合并数字，达成2048！</p>
                    <div class="swipe-hint">
                        <div class="arrow arrow-up"></div>
                        <div class="arrow arrow-right"></div>
                        <div class="arrow arrow-down"></div>
                        <div class="arrow arrow-left"></div>
                    </div>
                </div>
            `;
            document.querySelector('.grid').appendChild(intro);

            setTimeout(() => {
                intro.classList.add('show');
                localStorage.setItem('gameIntroShown', 'true');
                setTimeout(() => {
                    intro.classList.remove('show');
                    setTimeout(() => intro.remove(), 500);
                }, 2500);
            }, 500);
        }
    }

    addNewTile() {
        const emptyCells = this.grid.reduce((acc, val, idx) => {
            if (val === 0) acc.push(idx);
            return acc;
        }, []);

        if (emptyCells.length > 0) {
            const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            const newValue = Math.random() < 0.9 ? 2 : 4;
            this.grid[randomCell] = newValue;

            setTimeout(() => {
                const cells = document.querySelectorAll('.grid-cell');
                cells[randomCell].classList.add('new');

                if (this.useParticles) {
                    this.createPopParticles(cells[randomCell], newValue);
                }

                setTimeout(() => cells[randomCell].classList.remove('new'), 300);
            }, 50);
        }
    }

    createPopParticles(element, value) {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (!isMobile) return;

        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        let color;
        switch (value) {
            case 2: color = '#eee4da'; break;
            case 4: color = '#ede0c8'; break;
            case 8: color = '#f2b179'; break;
            default: color = '#f59563'; break;
        }

        const particleCount = 8;
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.backgroundColor = color;

            const size = Math.random() * 6 + 4;
            particle.style.width = size + 'px';
            particle.style.height = size + 'px';

            particle.style.position = 'fixed';
            particle.style.zIndex = '1000';
            particle.style.borderRadius = '50%';
            particle.style.left = centerX + 'px';
            particle.style.top = centerY + 'px';

            document.body.appendChild(particle);

            const angle = Math.random() * Math.PI * 2;
            const velocity = Math.random() * 80 + 40;
            const vx = Math.cos(angle) * velocity;
            const vy = Math.sin(angle) * velocity;

            const startTime = Date.now();
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const duration = 700;

                if (elapsed < duration) {
                    const progress = elapsed / duration;
                    const easing = 1 - Math.pow(1 - progress, 3);

                    const moveX = vx * easing;
                    const moveY = vy * easing;
                    const gravity = 300 * Math.pow(progress, 2);

                    particle.style.transform = `translate(${moveX}px, ${moveY + gravity}px)`;
                    particle.style.opacity = 1 - progress;

                    requestAnimationFrame(animate);
                } else {
                    document.body.removeChild(particle);
                }
            };

            requestAnimationFrame(animate);
        }
    }

    showTouchFeedback(x, y, direction) {
        if (!this.touchFeedbackEnabled) return;

        const gridElement = document.querySelector('.grid');
        const rect = gridElement.getBoundingClientRect();

        const feedback = document.createElement('div');
        feedback.className = 'touch-feedback';
        feedback.style.left = (x - rect.left) + 'px';
        feedback.style.top = (y - rect.top) + 'px';

        if (direction) {
            feedback.classList.add(`direction-${direction}`);
        }

        gridElement.appendChild(feedback);

        setTimeout(() => {
            gridElement.removeChild(feedback);
        }, 600);
    }

    updateView() {
        if (this.isAnimating) return;

        const cells = document.querySelectorAll('.grid-cell');
        cells.forEach((cell, index) => {
            const previousValue = parseInt(cell.textContent) || 0;
            const hadClass = cell.className.split(' ')
                .filter(c => c.startsWith('tile-'))
                .join(' ');

            cell.className = 'grid-cell';

            const value = this.grid[index];
            if (value !== 0) {
                cell.textContent = value;
                cell.classList.add(`tile-${value}`);

                if (previousValue !== value && previousValue !== 0) {
                    cell.classList.add('value-changed');
                    setTimeout(() => {
                        cell.classList.remove('value-changed');
                    }, 300);
                }
            } else {
                cell.textContent = '';

                if (previousValue !== 0) {
                    const ghost = document.createElement('div');
                    ghost.className = `grid-cell-ghost ${hadClass}`;
                    ghost.textContent = previousValue;
                    cell.appendChild(ghost);

                    setTimeout(() => {
                        ghost.classList.add('fade-out');
                        setTimeout(() => {
                            if (ghost.parentElement === cell) {
                                cell.removeChild(ghost);
                            }
                        }, 300);
                    }, 10);
                }
            }
        });

        if (this.lastTouchDirection) {
            const gridElement = document.querySelector('.grid');
            const directionClass = `slide-${this.lastTouchDirection.replace('Arrow', '').toLowerCase()}`;

            gridElement.classList.remove('slide-up', 'slide-down', 'slide-left', 'slide-right');

            gridElement.classList.add(directionClass);
            setTimeout(() => {
                gridElement.classList.remove(directionClass);
            }, 200);
        }
    }

    move(direction) {
        if (this.isAnimating) return;
        this.savePreviousState();

        this.isAnimating = true;
        let moved = false;

        switch (direction) {
            case 'ArrowLeft':
                moved = this.moveLeft();
                break;
            case 'ArrowRight':
                moved = this.moveRight();
                break;
            case 'ArrowUp':
                moved = this.moveUp();
                break;
            case 'ArrowDown':
                moved = this.moveDown();
                break;
        }

        if (moved) {
            this.lastTouchDirection = direction;

            document.querySelector('.grid').classList.add('grid-moved');

            setTimeout(() => {
                this.addNewTile();
                this.updateView();

                document.querySelector('.grid').classList.remove('grid-moved');

                if (this.score > this.bestScore) {
                    this.bestScore = this.score;
                    localStorage.setItem('bestScore', this.bestScore);
                    this.updateBestScore();
                    const bestScoreContainer = document.querySelector('.best-score');
                    bestScoreContainer.style.animation = 'pop 0.3s ease';
                    setTimeout(() => bestScoreContainer.style.animation = '', 300);
                }

                if (this.isGameOver()) {
                    this.showGameOver();
                } else if (this.hasWon()) {
                    this.showWinMessage();
                }

                setTimeout(() => {
                    this.isAnimating = false;
                }, 150);
            }, 150);
        } else {
            this.isAnimating = false;
        }
    }

    moveLeft() {
        return this.moveInRows((row) => row);
    }

    moveRight() {
        return this.moveInRows((row) => row.reverse());
    }

    moveUp() {
        return this.moveInColumns((col) => col);
    }

    moveDown() {
        return this.moveInColumns((col) => col.reverse());
    }

    moveInRows(transform) {
        let moved = false;
        for (let i = 0; i < 4; i++) {
            const row = this.getRow(i);
            const originalRow = [...row];
            const transformedRow = transform([...row]);
            const mergedRow = this.merge(transformedRow);
            const finalRow = transform === (row => row.reverse()) 
                ? mergedRow.reverse() 
                : mergedRow;
            
            for (let j = 0; j < 4; j++) {
                if (this.grid[i * 4 + j] !== finalRow[j]) {
                    moved = true;
                    this.grid[i * 4 + j] = finalRow[j];
                    
                    if (finalRow[j] !== 0 && finalRow[j] !== originalRow[j]) {
                        setTimeout(() => {
                            const cell = document.querySelectorAll('.grid-cell')[i * 4 + j];
                            cell.classList.add('merged');
                            if (finalRow[j] > originalRow[j]) {
                                const scorePopup = document.createElement('div');
                                scorePopup.className = 'score-popup';
                                scorePopup.textContent = '+' + finalRow[j];
                                cell.appendChild(scorePopup);
                                setTimeout(() => {
                                    scorePopup.remove();
                                }, 500);
                            }
                            setTimeout(() => cell.classList.remove('merged'), 300);
                        }, 50);
                    }
                }
            }
        }
        return moved;
    }

    moveInColumns(transform) {
        let moved = false;
        for (let j = 0; j < 4; j++) {
            const col = this.getColumn(j);
            const originalCol = [...col];
            const transformedCol = transform([...col]);
            const mergedCol = this.merge(transformedCol);
            const finalCol = transform === (col => col.reverse()) 
                ? mergedCol.reverse() 
                : mergedCol;
            
            for (let i = 0; i < 4; i++) {
                if (this.grid[i * 4 + j] !== finalCol[i]) {
                    moved = true;
                    this.grid[i * 4 + j] = finalCol[i];
                    
                    if (finalCol[i] !== 0 && finalCol[i] !== originalCol[i]) {
                        setTimeout(() => {
                            const cell = document.querySelectorAll('.grid-cell')[i * 4 + j];
                            cell.classList.add('merged');
                            if (finalCol[i] > originalCol[i]) {
                                const scorePopup = document.createElement('div');
                                scorePopup.className = 'score-popup';
                                scorePopup.textContent = '+' + finalCol[i];
                                cell.appendChild(scorePopup);
                                setTimeout(() => {
                                    scorePopup.remove();
                                }, 500);
                            }
                            setTimeout(() => cell.classList.remove('merged'), 300);
                        }, 50);
                    }
                }
            }
        }
        return moved;
    }

    getRow(index) {
        return this.grid.slice(index * 4, (index + 1) * 4);
    }

    getColumn(index) {
        return [
            this.grid[index],
            this.grid[index + 4],
            this.grid[index + 8],
            this.grid[index + 12]
        ];
    }

    merge(line) {
        const merged = line.filter(val => val !== 0);
        const result = [];
        let i = 0;
        
        while (i < merged.length) {
            if (i + 1 < merged.length && merged[i] === merged[i + 1]) {
                const mergedValue = merged[i] * 2;
                result.push(mergedValue);
                this.score += mergedValue;
                document.getElementById('score').textContent = this.score;
                i += 2;
            } else {
                result.push(merged[i]);
                i++;
            }
        }
        
        while (result.length < 4) {
            result.push(0);
        }
        
        return result;
    }

    hasWon() {
        return this.grid.some(cell => cell === 2048);
    }

    isGameOver() {
        if (this.grid.includes(0)) return false;

        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                const current = this.grid[i * 4 + j];
                if (
                    (j < 3 && current === this.grid[i * 4 + j + 1]) ||
                    (i < 3 && current === this.grid[(i + 1) * 4 + j])
                ) {
                    return false;
                }
            }
        }
        return true;
    }

    showGameOver() {
        const gameOver = document.createElement('div');
        gameOver.className = 'game-over';
        gameOver.innerHTML = `
            <h2>游戏结束！</h2>
            <p>最终得分: ${this.score}</p>
            <p>最高记录: ${this.bestScore}</p>
        `;
        document.querySelector('.grid').appendChild(gameOver);
    }

    showWinMessage() {
        if (!document.querySelector('.game-over')) {
            const winMessage = document.createElement('div');
            winMessage.className = 'game-over';
            winMessage.innerHTML = `
                <h2>恭喜获胜！</h2>
                <p>你的得分: ${this.score}</p>
                <p>继续挑战更高分数？</p>
            `;
            document.querySelector('.grid').appendChild(winMessage);
            
            setTimeout(() => {
                winMessage.remove();
            }, 3000);
        }
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                if (!this.isAnimating) {
                    this.move(e.key);
                }
            } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.undo();
            }
        });

        const gridElement = document.querySelector('.grid');
        
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || 
                        (/iPad|iPhone|iPod/.test(navigator.userAgent));
        
        if (isMobile) {
            document.body.classList.add('mobile-device');
            if (isSafari) {
                document.body.classList.add('safari-browser');
            }
        }
        
        let touchStartX = null;
        let touchStartY = null;
        let touchEndX = null;
        let touchEndY = null;
        let hasMoved = false;
        let touchStartTime = null;
        
        const handleTouchStart = (e) => {
            if (this.isAnimating) return;
            
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            touchEndX = null;
            touchEndY = null;
            hasMoved = false;
            touchStartTime = Date.now();
            
            e.preventDefault();
            
            gridElement.classList.add('touch-active');
        };
        
        const handleTouchMove = (e) => {
            if (!touchStartX || !touchStartY || this.isAnimating) return;
            
            e.preventDefault();
            
            const touch = e.touches[0];
            touchEndX = touch.clientX;
            touchEndY = touch.clientY;
            
            const moveThreshold = 3;
            if (Math.abs(touchEndX - touchStartX) > moveThreshold || 
                Math.abs(touchEndY - touchStartY) > moveThreshold) {
                hasMoved = true;
            }
        };
        
        const handleTouchEnd = (e) => {
            gridElement.classList.remove('touch-active');
            
            if (!touchStartX || !touchStartY || this.isAnimating) {
                resetTouchState();
                return;
            }
            
            const touchDuration = Date.now() - touchStartTime;
            
            if (touchEndX === null || touchEndY === null) {
                const touch = e.changedTouches[0];
                touchEndX = touch.clientX;
                touchEndY = touch.clientY;
            }
            
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            
            const swipeThreshold = isSafari ? 15 : 20;
            
            if (!hasMoved || Math.abs(deltaX) < swipeThreshold && Math.abs(deltaY) < swipeThreshold) {
                resetTouchState();
                return;
            }
            
            let direction;
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                direction = deltaX > 0 ? 'ArrowRight' : 'ArrowLeft';
            } else {
                direction = deltaY > 0 ? 'ArrowDown' : 'ArrowUp';
            }
            
            this.showTouchFeedback(touchEndX, touchEndY, direction.replace('Arrow', '').toLowerCase());
            
            this.move(direction);
            
            resetTouchState();
        };
        
        const handleTouchCancel = () => {
            gridElement.classList.remove('touch-active');
            resetTouchState();
        };
        
        const resetTouchState = () => {
            touchStartX = null;
            touchStartY = null;
            touchEndX = null;
            touchEndY = null;
            hasMoved = false;
            touchStartTime = null;
        };
        
        gridElement.removeEventListener('touchstart', handleTouchStart);
        gridElement.removeEventListener('touchmove', handleTouchMove);
        gridElement.removeEventListener('touchend', handleTouchEnd);
        gridElement.removeEventListener('touchcancel', handleTouchCancel);
        
        gridElement.addEventListener('touchstart', handleTouchStart, { passive: false });
        gridElement.addEventListener('touchmove', handleTouchMove, { passive: false });
        gridElement.addEventListener('touchend', handleTouchEnd, { passive: true });
        gridElement.addEventListener('touchcancel', handleTouchCancel, { passive: true });
        
        if (isSafari && isMobile) {
            document.body.addEventListener('touchmove', (e) => {
                if (e.target.closest('.grid')) {
                    e.preventDefault();
                }
            }, { passive: false });
            
            const viewport = document.querySelector('meta[name="viewport"]');
            if (viewport) {
                viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
            }
            
            gridElement.addEventListener('touchstart', (e) => {
                if (e.target.closest('.grid')) {
                    e.preventDefault();
                }
            }, { passive: false });
        }

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                localStorage.setItem('gameState', JSON.stringify({
                    grid: this.grid,
                    score: this.score,
                    bestScore: this.bestScore
                }));
            } else {
                this.updateView();
            }
        });

        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.updateView();
            }, 200);
        });

        const savedState = localStorage.getItem('gameState');
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                this.grid = state.grid;
                this.score = state.score;
                this.bestScore = state.bestScore;
                this.updateView();
                document.getElementById('score').textContent = this.score;
                this.updateBestScore();
            } catch (e) {
                console.error('Error restoring game state:', e);
                localStorage.removeItem('gameState');
            }
        }

        document.getElementById('newGame').addEventListener('click', () => {
            this.init();
        });
    }
}

new Game2048();