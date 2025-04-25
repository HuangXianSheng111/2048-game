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
        this.init();
        this.setupEventListeners();
        this.updateBestScore();
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

    addNewTile() {
        const emptyCells = this.grid.reduce((acc, val, idx) => {
            if (val === 0) acc.push(idx);
            return acc;
        }, []);

        if (emptyCells.length > 0) {
            const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            this.grid[randomCell] = Math.random() < 0.9 ? 2 : 4;
            setTimeout(() => {
                const cells = document.querySelectorAll('.grid-cell');
                cells[randomCell].classList.add('new');
                setTimeout(() => cells[randomCell].classList.remove('new'), 300);
            }, 50);
        }
    }

    updateView() {
        if (this.isAnimating) return;
        const cells = document.querySelectorAll('.grid-cell');
        cells.forEach((cell, index) => {
            cell.className = 'grid-cell';
            cell.textContent = '';
            const value = this.grid[index];
            if (value !== 0) {
                cell.textContent = value;
                cell.classList.add(`tile-${value}`);
            }
        });
    }

    move(direction) {
        if (this.isAnimating) return;
        this.savePreviousState();
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
            this.addNewTile();
            this.updateView();
            
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
                    
                    // 如果是合并结果，添加合并动画
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
                    
                    // 如果是合并结果，添加合并动画
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
        
        // 检测是否是Safari浏览器
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        
        // 防止Safari的弹性滚动行为
        if (isSafari) {
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
            document.body.style.height = '100%';
        }

        let touchStartTime;
        let touchEndTime;
        let hasMoved = false;
        
        // 使用touchforcechange事件检测Safari上的3D Touch
        if (isSafari) {
            gridElement.addEventListener('touchforcechange', (e) => {
                e.preventDefault();
            }, { passive: false });
        }
        
        gridElement.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) return;
            
            touchStartTime = new Date().getTime();
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
            hasMoved = false;
            
            // Safari需要在touchstart中阻止默认行为
            if (isSafari) {
                e.preventDefault();
            }
        }, isSafari ? { passive: false } : { passive: true });

        gridElement.addEventListener('touchmove', (e) => {
            if (!this.touchStartX || !this.touchStartY) return;
            
            const touchMoveX = e.touches[0].clientX;
            const touchMoveY = e.touches[0].clientY;
            
            const deltaX = touchMoveX - this.touchStartX;
            const deltaY = touchMoveY - this.touchStartY;
            
            // 判断是否移动足够距离
            if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
                hasMoved = true;
                e.preventDefault();
            }
        }, { passive: false });

        gridElement.addEventListener('touchend', (e) => {
            if (!this.touchStartX || !this.touchStartY) return;
            
            touchEndTime = new Date().getTime();
            const touchDuration = touchEndTime - touchStartTime;

            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;

            const deltaX = touchEndX - this.touchStartX;
            const deltaY = touchEndY - this.touchStartY;
            
            // Safari对较短滑动的响应更敏感
            const minSwipeDistance = isSafari ? 15 : 20;
            
            // 如果滑动太短或持续时间过长，不响应
            if ((Math.abs(deltaX) < minSwipeDistance && Math.abs(deltaY) < minSwipeDistance) || 
                touchDuration > 1000 || !hasMoved) {
                return;
            }

            // 防抖
            this.isAnimating = true;
            setTimeout(() => {
                this.isAnimating = false;
            }, 100);

            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                if (deltaX > 0) {
                    this.move('ArrowRight');
                } else {
                    this.move('ArrowLeft');
                }
            } else {
                if (deltaY > 0) {
                    this.move('ArrowDown');
                } else {
                    this.move('ArrowUp');
                }
            }

            this.touchStartX = null;
            this.touchStartY = null;
            
            if (isSafari) {
                e.preventDefault();
            }
        }, isSafari ? { passive: false } : { passive: true });

        // 更完整的手势处理
        const preventGesture = (e) => {
            e.preventDefault();
        };
        
        if (typeof document.documentElement.style.touchAction === 'undefined') {
            // 老版本浏览器需要这些处理
            document.addEventListener('gesturestart', preventGesture, { passive: false });
            document.addEventListener('gesturechange', preventGesture, { passive: false });
            document.addEventListener('gestureend', preventGesture, { passive: false });
        }

        // 专门为Safari添加指针事件支持
        if (isSafari && window.PointerEvent) {
            gridElement.addEventListener('pointerdown', (e) => {
                if (e.pointerType === 'touch') {
                    e.preventDefault();
                }
            }, { passive: false });
        }

        // 处理页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // 保存游戏状态
                localStorage.setItem('gameState', JSON.stringify({
                    grid: this.grid,
                    score: this.score,
                    bestScore: this.bestScore
                }));
            } else {
                // 恢复焦点时，刷新视图以防任何显示问题
                this.updateView();
            }
        });

        // 处理屏幕方向变化
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                // 方向变化后等待DOM更新，然后刷新视图
                this.updateView();
            }, 200);
        });

        // 恢复之前的游戏状态
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