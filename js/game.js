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
        this.isFirstGame = !localStorage.getItem('hasPlayed');
        this.init();
        this.setupEventListeners();
        this.updateBestScore();
        if (this.isFirstGame) {
            this.showTutorial();
        }
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

        // 显示方向指示器
        this.showDirectionIndicator(direction);

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
            // 给予触觉反馈（仅限支持的设备）
            if ('vibrate' in navigator) {
                navigator.vibrate(15); // 轻微振动15ms
            }
            
            // 标记已经玩过游戏
            if (this.isFirstGame) {
                localStorage.setItem('hasPlayed', 'true');
                this.isFirstGame = false;
            }

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
        } else {
            // 如果没有移动，显示无效移动指示
            this.showInvalidMove(direction);
        }
    }

    moveLeft() {
        return this.moveInRows(
            row => row,              // 不需要预处理 
            false                    // 不需要反转结果
        );
    }

    moveRight() {
        return this.moveInRows(
            row => row.reverse(),    // 先反转行
            true                     // 需要反转结果
        );
    }

    moveUp() {
        return this.moveInColumns(
            col => col,              // 不需要预处理
            false                    // 不需要反转结果
        );
    }

    moveDown() {
        return this.moveInColumns(
            col => col.reverse(),    // 先反转列
            true                     // 需要反转结果
        );
    }

    moveInRows(preTransform, needsReverse) {
        let moved = false;
        this.isAnimating = true;  // 立即设置动画状态以防止多次操作
        const allAnimationPromises = [];
        
        for (let i = 0; i < 4; i++) {
            const row = this.getRow(i);
            const originalRow = [...row];
            
            // 应用方向预处理变换（例如右移时先反转）
            const transformedRow = preTransform([...row]);
            
            // 执行标准的左移动（向操作方向移动）操作
            const processedRow = this.mergeAndCompress(transformedRow);
            
            // 如果需要，反向变换回原始方向（右移时反转回来）
            const finalRow = needsReverse ? processedRow.reverse() : processedRow;
            
            // 检查是否有变化
            const hasChanged = !this.arraysEqual(originalRow, finalRow);
            if (hasChanged) {
                moved = true;
            }
            
            // 更新网格并应用动画效果
            for (let j = 0; j < 4; j++) {
                const cellIndex = i * 4 + j;
                const oldValue = this.grid[cellIndex];
                const newValue = finalRow[j];
                
                if (oldValue !== newValue) {
                    const cells = document.querySelectorAll('.grid-cell');
                    
                    // 更新网格值
                    this.grid[cellIndex] = newValue;
                    
                    // 如果是合并结果，添加合并动画
                    if (newValue !== 0 && newValue !== oldValue && oldValue !== 0) {
                        const animPromise = new Promise(resolve => {
                            setTimeout(() => {
                                const cell = cells[cellIndex];
                                cell.classList.add('merged');
                                
                                // 分数弹出
                                const scorePopup = document.createElement('div');
                                scorePopup.className = 'score-popup';
                                scorePopup.textContent = '+' + newValue;
                                cell.appendChild(scorePopup);
                                
                                // 粒子效果
                                this.createMergeParticles(cell, newValue);
                                
                                setTimeout(() => {
                                    scorePopup.remove();
                                    resolve();
                                }, 500);
                                
                                setTimeout(() => cell.classList.remove('merged'), 300);
                            }, 50);
                        });
                        
                        allAnimationPromises.push(animPromise);
                    }
                    // 为移动添加滑动动画
                    else if (newValue !== 0) {
                        const animPromise = new Promise(resolve => {
                            setTimeout(() => {
                                const cell = cells[cellIndex];
                                cell.classList.add('slide');
                                
                                setTimeout(() => {
                                    cell.classList.remove('slide');
                                    resolve();
                                }, 200);
                            }, 50);
                        });
                        
                        allAnimationPromises.push(animPromise);
                    }
                }
            }
        }
        
        // 等待所有动画完成
        if (allAnimationPromises.length > 0) {
            Promise.all(allAnimationPromises).then(() => {
                this.isAnimating = false;
            });
        } else {
            this.isAnimating = false;
        }
        
        return moved;
    }

    moveInColumns(preTransform, needsReverse) {
        let moved = false;
        this.isAnimating = true;  // 立即设置动画状态以防止多次操作
        const allAnimationPromises = [];
        
        for (let j = 0; j < 4; j++) {
            const col = this.getColumn(j);
            const originalCol = [...col];
            
            // 应用方向预处理变换（例如下移时先反转）
            const transformedCol = preTransform([...col]);
            
            // 执行标准的上移动（向操作方向移动）操作
            const processedCol = this.mergeAndCompress(transformedCol);
            
            // 如果需要，反向变换回原始方向（下移时反转回来）
            const finalCol = needsReverse ? processedCol.reverse() : processedCol;
            
            // 检查是否有变化
            const hasChanged = !this.arraysEqual(originalCol, finalCol);
            if (hasChanged) {
                moved = true;
            }
            
            // 更新网格并应用动画效果
            for (let i = 0; i < 4; i++) {
                const cellIndex = i * 4 + j;
                const oldValue = this.grid[cellIndex];
                const newValue = finalCol[i];
                
                if (oldValue !== newValue) {
                    const cells = document.querySelectorAll('.grid-cell');
                    
                    // 更新网格值
                    this.grid[cellIndex] = newValue;
                    
                    // 如果是合并结果，添加合并动画
                    if (newValue !== 0 && newValue !== oldValue && oldValue !== 0) {
                        const animPromise = new Promise(resolve => {
                            setTimeout(() => {
                                const cell = cells[cellIndex];
                                cell.classList.add('merged');
                                
                                // 分数弹出
                                const scorePopup = document.createElement('div');
                                scorePopup.className = 'score-popup';
                                scorePopup.textContent = '+' + newValue;
                                cell.appendChild(scorePopup);
                                
                                // 粒子效果
                                this.createMergeParticles(cell, newValue);
                                
                                setTimeout(() => {
                                    scorePopup.remove();
                                    resolve();
                                }, 500);
                                
                                setTimeout(() => cell.classList.remove('merged'), 300);
                            }, 50);
                        });
                        
                        allAnimationPromises.push(animPromise);
                    }
                    // 为移动添加滑动动画
                    else if (newValue !== 0) {
                        const animPromise = new Promise(resolve => {
                            setTimeout(() => {
                                const cell = cells[cellIndex];
                                cell.classList.add('slide');
                                
                                setTimeout(() => {
                                    cell.classList.remove('slide');
                                    resolve();
                                }, 200);
                            }, 50);
                        });
                        
                        allAnimationPromises.push(animPromise);
                    }
                }
            }
        }
        
        // 等待所有动画完成
        if (allAnimationPromises.length > 0) {
            Promise.all(allAnimationPromises).then(() => {
                this.isAnimating = false;
            });
        } else {
            this.isAnimating = false;
        }
        
        return moved;
    }
    
    // 新增: 辅助函数比较两个数组是否相等
    arraysEqual(arr1, arr2) {
        if (arr1.length !== arr2.length) return false;
        for (let i = 0; i < arr1.length; i++) {
            if (arr1[i] !== arr2[i]) return false;
        }
        return true;
    }
    
    // 关键修复: 彻底重写mergeAndCompress函数，确保数字正确移动到边界
    mergeAndCompress(line) {
        // 步骤1：移除所有零，并将非零数字向前压缩（向移动方向靠拢）
        let nonZeros = line.filter(val => val !== 0);
        
        // 步骤2：合并相邻的相同数字
        const result = [];
        let i = 0;
        
        while (i < nonZeros.length) {
            // 如果当前数字与下一个数字相同，则合并
            if (i + 1 < nonZeros.length && nonZeros[i] === nonZeros[i + 1]) {
                const mergedValue = nonZeros[i] * 2;
                result.push(mergedValue);
                this.score += mergedValue;
                document.getElementById('score').textContent = this.score;
                this.checkAchievement(mergedValue);
                i += 2; // 跳过已合并的两个数字
            } else {
                // 不能合并，保留原数字
                result.push(nonZeros[i]);
                i++;
            }
        }
        
        // 步骤3：填充剩余位置为0（确保数字都在边界一侧）
        while (result.length < 4) {
            result.push(0);
        }
        
        return result;
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

    showDirectionIndicator(direction) {
        // 创建方向指示器元素
        const indicator = document.createElement('div');
        indicator.className = 'direction-indicator';
        
        // 根据方向设置样式和内容
        switch (direction) {
            case 'ArrowLeft':
                indicator.innerHTML = '←';
                indicator.style.left = '10px';
                indicator.style.top = '50%';
                break;
            case 'ArrowRight':
                indicator.innerHTML = '→';
                indicator.style.right = '10px';
                indicator.style.top = '50%';
                break;
            case 'ArrowUp':
                indicator.innerHTML = '↑';
                indicator.style.top = '10px';
                indicator.style.left = '50%';
                break;
            case 'ArrowDown':
                indicator.innerHTML = '↓';
                indicator.style.bottom = '10px';
                indicator.style.left = '50%';
                break;
        }
        
        // 添加到DOM并设置自动消失
        const grid = document.querySelector('.grid');
        grid.appendChild(indicator);
        
        setTimeout(() => {
            indicator.classList.add('fade-out');
            setTimeout(() => {
                indicator.remove();
            }, 300);
        }, 300);
    }
    
    showInvalidMove(direction) {
        // 视觉反馈表示移动无效
        const grid = document.querySelector('.grid');
        grid.classList.add('invalid-move');
        
        setTimeout(() => {
            grid.classList.remove('invalid-move');
        }, 300);
    }
    
    showTutorial() {
        // 创建教程覆盖层
        const tutorial = document.createElement('div');
        tutorial.className = 'tutorial-overlay';
        tutorial.innerHTML = `
            <div class="tutorial-content">
                <h3>欢迎来到 2048!</h3>
                <div class="tutorial-step">
                    <div class="tutorial-image swipe-animation"></div>
                    <p>滑动屏幕合并相同的数字</p>
                </div>
                <div class="tutorial-step">
                    <div class="tutorial-tiles">
                        <div class="mini-tile">2</div>
                        <div class="mini-tile">2</div>
                        <div class="mini-arrow">→</div>
                        <div class="mini-tile-merged">4</div>
                    </div>
                    <p>合并相同数字得到它们的和</p>
                </div>
                <div class="tutorial-step">
                    <div class="tutorial-image goal-animation">2048</div>
                    <p>达到2048数字获胜!</p>
                </div>
                <button id="start-game">开始游戏</button>
            </div>
        `;
        
        document.body.appendChild(tutorial);
        
        // 点击开始按钮关闭教程
        document.getElementById('start-game').addEventListener('click', () => {
            tutorial.classList.add('fade-out');
            setTimeout(() => {
                tutorial.remove();
            }, 300);
        });
    }
    
    createMergeParticles(cell, value) {
        // 创建合并时的粒子效果
        const rect = cell.getBoundingClientRect();
        const numParticles = 10;
        
        for (let i = 0; i < numParticles; i++) {
            const particle = document.createElement('div');
            particle.className = 'merge-particle';
            
            // 根据数字值设置粒子颜色
            const color = this.getColorForValue(value);
            particle.style.backgroundColor = color;
            
            // 随机位置和动画
            const angle = Math.random() * Math.PI * 2;
            const distance = 30 + Math.random() * 40;
            const animation = Math.random() * 0.3 + 0.5;
            
            particle.style.left = `${rect.width / 2}px`;
            particle.style.top = `${rect.height / 2}px`;
            particle.style.setProperty('--angle', `${angle}rad`);
            particle.style.setProperty('--distance', `${distance}px`);
            particle.style.setProperty('--animation-time', `${animation}s`);
            
            cell.appendChild(particle);
            
            setTimeout(() => {
                particle.remove();
            }, animation * 1000);
        }
    }
    
    getColorForValue(value) {
        // 根据数字值返回合适的颜色
        const colors = {
            2: '#eee4da',
            4: '#ede0c8',
            8: '#f2b179',
            16: '#f59563',
            32: '#f67c5f',
            64: '#f65e3b',
            128: '#edcf72',
            256: '#edcc61',
            512: '#edc850',
            1024: '#edc53f',
            2048: '#edc22e'
        };
        return colors[value] || '#3c3a32';
    }

    setupEventListeners() {
        // 键盘事件 (仅桌面端)
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
        
        // 优化的设备和浏览器检测
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        // Safari检测 (特别关注iOS设备)
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || 
                        (/iPad|iPhone|iPod/.test(navigator.userAgent));
        
        // 为移动设备和Safari添加特殊标记
        if (isMobile) {
            document.body.classList.add('mobile-device');
            if (isSafari) {
                document.body.classList.add('safari-browser');
            }
        }
        
        // 触摸状态变量
        let touchStartX = null;
        let touchStartY = null;
        let touchEndX = null;
        let touchEndY = null;
        let hasMoved = false;
        
        // 简化和优化的触摸处理函数
        const handleTouchStart = (e) => {
            if (this.isAnimating) return;
            
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            hasMoved = false;
            
            // 防止长按菜单
            e.preventDefault();
        };
        
        const handleTouchMove = (e) => {
            if (!touchStartX || !touchStartY || this.isAnimating) return;
            
            // 关键：阻止Safari中的默认滚动行为
            e.preventDefault();
            
            const touch = e.touches[0];
            touchEndX = touch.clientX;
            touchEndY = touch.clientY;
            
            // 设置移动标志
            if (Math.abs(touchEndX - touchStartX) > 5 || Math.abs(touchEndY - touchStartY) > 5) {
                hasMoved = true;
            }
        };
        
        const handleTouchEnd = (e) => {
            // 确保有有效的开始和结束坐标
            if (!touchStartX || !touchStartY || this.isAnimating || !hasMoved) {
                touchStartX = null;
                touchStartY = null;
                touchEndX = null;
                touchEndY = null;
                return;
            }
            
            // 如果没有结束坐标(没有触发touchmove)，使用最后一个触摸点
            if (touchEndX === null || touchEndY === null) {
                const touch = e.changedTouches[0];
                touchEndX = touch.clientX;
                touchEndY = touch.clientY;
            }
            
            // 计算滑动距离和方向
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            
            // 较低的阈值，更灵敏的检测 (针对Safari优化)
            const swipeThreshold = 20;
            
            // 重置触摸状态
            const tempDeltaX = deltaX;
            const tempDeltaY = deltaY;
            touchStartX = null;
            touchStartY = null;
            touchEndX = null;
            touchEndY = null;
            
            // 忽略太小的移动
            if (Math.abs(tempDeltaX) < swipeThreshold && Math.abs(tempDeltaY) < swipeThreshold) {
                return;
            }
            
            // 确定主要滑动方向并执行移动
            if (Math.abs(tempDeltaX) > Math.abs(tempDeltaY)) {
                // 水平滑动
                this.move(tempDeltaX > 0 ? 'ArrowRight' : 'ArrowLeft');
            } else {
                // 垂直滑动
                this.move(tempDeltaY > 0 ? 'ArrowDown' : 'ArrowUp');
            }
        };
        
        const handleTouchCancel = () => {
            touchStartX = null;
            touchStartY = null;
            touchEndX = null;
            touchEndY = null;
            hasMoved = false;
        };
        
        // 移除旧的事件监听器以避免重复
        gridElement.removeEventListener('touchstart', handleTouchStart);
        gridElement.removeEventListener('touchmove', handleTouchMove);
        gridElement.removeEventListener('touchend', handleTouchEnd);
        gridElement.removeEventListener('touchcancel', handleTouchCancel);
        
        // 添加优化的事件监听器
        gridElement.addEventListener('touchstart', handleTouchStart, { passive: false });
        gridElement.addEventListener('touchmove', handleTouchMove, { passive: false }); // 关键: passive: false 允许阻止默认滑动
        gridElement.addEventListener('touchend', handleTouchEnd, { passive: true });
        gridElement.addEventListener('touchcancel', handleTouchCancel, { passive: true });
        
        // Safari特定修复: 阻止整个页面在游戏区域上的默认滚动行为
        if (isSafari && isMobile) {
            // 1. 整页阻止默认滚动行为
            document.body.addEventListener('touchmove', (e) => {
                if (e.target.closest('.grid')) {
                    e.preventDefault();
                }
            }, { passive: false });
            
            // 2. 确保viewport设置正确
            const viewport = document.querySelector('meta[name="viewport"]');
            if (viewport) {
                viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
            }
            
            // 3. 针对Safari的额外滑动增强
            gridElement.addEventListener('touchstart', (e) => {
                // 在网格元素上始终阻止默认行为
                if (e.target.closest('.grid')) {
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
        
        // 添加游戏成就触发器
        this.setupAchievementSystem();
    }
    
    setupAchievementSystem() {
        // 监听分数变化触发成就
        const achievementThresholds = [512, 1024, 2048];
        let lastAchievementReached = parseInt(localStorage.getItem('lastAchievement') || '0');
        
        // 检查合并时是否达到成就
        this.checkAchievement = (value) => {
            if (value >= Math.max(...achievementThresholds)) {
                // 检查所有成就
                for (const threshold of achievementThresholds) {
                    if (value >= threshold && threshold > lastAchievementReached) {
                        this.showAchievement(`达成 ${threshold}!`, `恭喜合并出 ${threshold} 数字!`);
                        lastAchievementReached = threshold;
                        localStorage.setItem('lastAchievement', threshold);
                        break;
                    }
                }
            }
        };
    }
    
    showAchievement(title, message) {
        const achievement = document.createElement('div');
        achievement.className = 'achievement';
        achievement.innerHTML = `
            <div class="achievement-icon">🏆</div>
            <div class="achievement-content">
                <h4>${title}</h4>
                <p>${message}</p>
            </div>
        `;
        
        document.body.appendChild(achievement);
        
        // 动画显示和自动消失
        setTimeout(() => {
            achievement.classList.add('show');
            
            setTimeout(() => {
                achievement.classList.remove('show');
                setTimeout(() => {
                    achievement.remove();
                }, 500);
            }, 3000);
        }, 100);
    }
}

new Game2048();