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

        // 音效系统初始化
        this.soundEnabled = localStorage.getItem('soundEnabled') !== 'false'; // 默认开启音效
        this.audioContext = null;
        this.initAudioContext();

        this.init();
        this.setupEventListeners();
        this.updateBestScore();
        if (this.isFirstGame) {
            this.showTutorial();
        }

        // 更新音效按钮状态
        this.updateSoundButtonState();
    }

    // 初始化音频上下文
    initAudioContext() {
        try {
            // 创建Web Audio API的AudioContext
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();

            console.log('音频系统初始化成功');
        } catch (e) {
            console.warn('该浏览器不支持Web Audio API:', e);
            this.soundEnabled = false;
        }
    }

    // 更新音效按钮状态
    updateSoundButtonState() {
        const soundToggle = document.getElementById('soundToggle');
        if (soundToggle) {
            if (this.soundEnabled) {
                soundToggle.textContent = '🔊';
                soundToggle.classList.remove('sound-off');
                soundToggle.classList.add('sound-on');
                soundToggle.setAttribute('aria-label', '关闭声音');
            } else {
                soundToggle.textContent = '🔈';
                soundToggle.classList.remove('sound-on');
                soundToggle.classList.add('sound-off');
                soundToggle.setAttribute('aria-label', '打开声音');
            }
        }
    }

    // 创建并播放移动音效 - 优化为更清脆和高级的效果
    playMoveSound() {
        if (!this.soundEnabled || !this.audioContext) return;

        try {
            // 创建更复杂的多层音色以获得高级质感
            const percussive = this.audioContext.createOscillator(); // 打击感音色
            const slide = this.audioContext.createOscillator(); // 滑动音色
            const accent = this.audioContext.createOscillator(); // 强调音
            
            const percussiveGain = this.audioContext.createGain();
            const slideGain = this.audioContext.createGain();
            const accentGain = this.audioContext.createGain();
            
            // 创建立体声声像控制器
            const stereoPanner = this.audioContext.createStereoPanner();
            stereoPanner.pan.value = (Math.random() * 0.5) - 0.25; // 轻微随机立体声定位
            
            // 创建动态压缩器增强质感
            const compressor = this.audioContext.createDynamicsCompressor();
            compressor.threshold.value = -24;
            compressor.knee.value = 30;
            compressor.ratio.value = 12;
            compressor.attack.value = 0.003;
            compressor.release.value = 0.25;
            
            // 创建高通滤波器增强清脆感
            const highpassFilter = this.audioContext.createBiquadFilter();
            highpassFilter.type = 'highpass';
            highpassFilter.frequency.value = 1200;
            highpassFilter.Q.value = 0.9;
            
            // 创建低通滤波器控制音色
            const lowpassFilter = this.audioContext.createBiquadFilter();
            lowpassFilter.type = 'lowpass';
            lowpassFilter.frequency.value = 8000;
            lowpassFilter.Q.value = 0.5;

            // 打击感音色 - 使用noise冲击声增加清脆质感
            percussive.type = 'triangle';
            percussive.frequency.setValueAtTime(1800, this.audioContext.currentTime);
            percussive.frequency.exponentialRampToValueAtTime(
                600, this.audioContext.currentTime + 0.08
            );

            // 滑动音色 - 使用正弦波营造滑动感
            slide.type = 'sine';
            slide.frequency.setValueAtTime(420, this.audioContext.currentTime);
            slide.frequency.exponentialRampToValueAtTime(
                220, this.audioContext.currentTime + 0.12
            );

            // 强调音 - 短促高频声增加锐度
            accent.type = 'sawtooth';
            accent.frequency.setValueAtTime(2000, this.audioContext.currentTime);
            accent.frequency.exponentialRampToValueAtTime(
                1200, this.audioContext.currentTime + 0.05
            );

            // 精确的音量曲线控制（ADSR包络）
            // 打击感声音：快速起音，快速衰减
            percussiveGain.gain.setValueAtTime(0, this.audioContext.currentTime);
            percussiveGain.gain.linearRampToValueAtTime(0.09, this.audioContext.currentTime + 0.01);
            percussiveGain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.12);

            // 滑动音色：稍慢起音，中等衰减
            slideGain.gain.setValueAtTime(0, this.audioContext.currentTime);
            slideGain.gain.linearRampToValueAtTime(0.05, this.audioContext.currentTime + 0.03);
            slideGain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.15);

            // 强调音：极快起音，非常快衰减
            accentGain.gain.setValueAtTime(0, this.audioContext.currentTime);
            accentGain.gain.linearRampToValueAtTime(0.04, this.audioContext.currentTime + 0.005);
            accentGain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.08);

            // 复杂的音频路由
            percussive.connect(percussiveGain);
            slide.connect(slideGain);
            accent.connect(accentGain);
            
            // 主要音色通过高通滤波器增强清脆感
            percussiveGain.connect(highpassFilter);
            
            // 滑动音色直接连到立体声声像
            slideGain.connect(stereoPanner);
            
            // 强调音通过低通滤波器柔化高频
            accentGain.connect(lowpassFilter);
            lowpassFilter.connect(stereoPanner);
            
            // 所有音色最后通过压缩器融合在一起
            highpassFilter.connect(compressor);
            stereoPanner.connect(compressor);
            
            // 输出到扬声器
            compressor.connect(this.audioContext.destination);

            // 开始并停止音效
            const now = this.audioContext.currentTime;
            percussive.start(now);
            slide.start(now + 0.01); // 轻微错开起始时间，增加层次感
            accent.start(now);
            
            percussive.stop(now + 0.15);
            slide.stop(now + 0.18);
            accent.stop(now + 0.1);
        } catch (e) {
            console.warn('播放移动音效失败:', e);
        }
    }

    // 创建并播放合并音效 - 优化为更清脆和高级的效果
    playMergeSound(value) {
        if (!this.soundEnabled || !this.audioContext) return;

        try {
            // 创建复杂的四层音效，构建专业的合成音色
            const mainOsc = this.audioContext.createOscillator(); // 主音
            const impactOsc = this.audioContext.createOscillator(); // 冲击音
            const shimmerOsc = this.audioContext.createOscillator(); // 闪烁高频
            const reverbOsc = this.audioContext.createOscillator(); // 混响尾音
            
            const mainGain = this.audioContext.createGain();
            const impactGain = this.audioContext.createGain();
            const shimmerGain = this.audioContext.createGain();
            const reverbGain = this.audioContext.createGain();
            
            // 创建立体声延迟增加空间感
            const delay = this.audioContext.createDelay(0.5);
            delay.delayTime.value = 0.03;
            
            const delayGain = this.audioContext.createGain();
            delayGain.gain.value = 0.2;
            
            // 为高频部分创建高架滤波器
            const highShelf = this.audioContext.createBiquadFilter();
            highShelf.type = 'highshelf';
            highShelf.frequency.value = 3000;
            highShelf.gain.value = 6;
            
            // 低频增强
            const lowShelf = this.audioContext.createBiquadFilter();
            lowShelf.type = 'lowshelf';
            lowShelf.frequency.value = 300;
            lowShelf.gain.value = 4;
            
            // 波形整形器（失真单元）添加温暖音色
            const distortion = this.audioContext.createWaveShaper();
            const makeDistortionCurve = (amount) => {
                const k = typeof amount === 'number' ? amount : 20;
                const n_samples = 44100;
                const curve = new Float32Array(n_samples);
                const deg = Math.PI / 180;
                
                for (let i = 0; i < n_samples; ++i) {
                    const x = i * 2 / n_samples - 1;
                    curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
                }
                return curve;
            };
            distortion.curve = makeDistortionCurve(5); // 轻微失真
            distortion.oversample = '4x';
            
            // 根据合并值计算频率（数值越大，音调越高）
            const baseFrequency = 220;
            // 使用对数映射使音高变化更加音乐化
            const frequencyMultiplier = 1 + Math.log10(value) * 0.3;
            const frequency = baseFrequency * frequencyMultiplier;
            
            // 计算和弦音符（使用音乐理论增加和谐感）
            const majorThird = frequency * 1.25; // 大三度
            const perfectFifth = frequency * 1.5; // 纯五度
            
            // 设置所有振荡器
            // 主音 - 使用三角波提供丰富而清晰的基础
            mainOsc.type = 'triangle';
            mainOsc.frequency.value = frequency;

            // 冲击音 - 短促的正弦波提供清脆的初始打击感
            impactOsc.type = 'sine';
            impactOsc.frequency.value = frequency * 2;

            // 闪烁高频 - 使用高八度的正弦波增加亮度
            shimmerOsc.type = 'sine';
            shimmerOsc.frequency.value = perfectFifth;
            
            // 混响尾音 - 低频的三角波增加温暖感
            reverbOsc.type = 'triangle';
            reverbOsc.frequency.value = majorThird;
            reverbOsc.detune.value = 5; // 轻微失谐增加厚度

            // 复杂的音量包络设计
            const now = this.audioContext.currentTime;
            
            // 主音 - 中等起音，缓慢衰减
            mainGain.gain.setValueAtTime(0, now);
            mainGain.gain.linearRampToValueAtTime(0.18, now + 0.02);
            mainGain.gain.setValueAtTime(0.18, now + 0.03);
            mainGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

            // 冲击音 - 非常快的起音，快速衰减
            impactGain.gain.setValueAtTime(0, now);
            impactGain.gain.linearRampToValueAtTime(0.15, now + 0.005);
            impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

            // 闪烁高频 - 延迟起音，中等衰减
            shimmerGain.gain.setValueAtTime(0, now);
            shimmerGain.gain.linearRampToValueAtTime(0.07, now + 0.03);
            shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            
            // 混响尾音 - 缓慢起音，缓慢衰减
            reverbGain.gain.setValueAtTime(0, now);
            reverbGain.gain.linearRampToValueAtTime(0.08, now + 0.05);
            reverbGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

            // 复杂的音频路由
            mainOsc.connect(mainGain);
            impactOsc.connect(impactGain);
            shimmerOsc.connect(shimmerGain);
            reverbOsc.connect(reverbGain);
            
            // 主音直接输出并通过延迟线
            mainGain.connect(lowShelf);
            mainGain.connect(delay);
            
            // 冲击音通过高架滤波器增强清脆度
            impactGain.connect(highShelf);
            
            // 闪烁高频增添明亮感
            shimmerGain.connect(highShelf);
            
            // 混响尾音通过失真单元增加温暖感
            reverbGain.connect(distortion);
            
            // 组合处理后的信号
            lowShelf.connect(this.audioContext.destination);
            highShelf.connect(this.audioContext.destination);
            
            delay.connect(delayGain);
            delayGain.connect(this.audioContext.destination);
            
            distortion.connect(this.audioContext.destination);

            // 开始并停止所有振荡器
            mainOsc.start(now);
            impactOsc.start(now);
            shimmerOsc.start(now + 0.01); // 轻微延迟增加层次感
            reverbOsc.start(now + 0.02); // 更多延迟增加空间感
            
            mainOsc.stop(now + 0.4);
            impactOsc.stop(now + 0.2);
            shimmerOsc.stop(now + 0.3);
            reverbOsc.stop(now + 0.5);
            
            // 添加一个微小的"奖励音"，仅当合并的值很高时
            if (value >= 64) {
                setTimeout(() => {
                    this.playHighValueRewardSound(value);
                }, 100);
            }
        } catch (e) {
            console.warn('播放合并音效失败:', e);
        }
    }
    
    // 当合并出高数值时播放额外的奖励音效
    playHighValueRewardSound(value) {
        if (!this.soundEnabled || !this.audioContext) return;
        
        try {
            const now = this.audioContext.currentTime;
            const osc1 = this.audioContext.createOscillator();
            const osc2 = this.audioContext.createOscillator();
            const gain1 = this.audioContext.createGain();
            const gain2 = this.audioContext.createGain();
            
            // 基于数值计算音阶（越高越明亮）
            const baseNote = 440 * (1 + Math.log2(value) * 0.1);
            
            // 使用音乐上和谐的音程
            osc1.type = 'sine';
            osc1.frequency.value = baseNote;
            
            osc2.type = 'triangle';
            osc2.frequency.value = baseNote * 1.5; // 纯五度
            
            // 轻柔的音量包络
            gain1.gain.setValueAtTime(0, now);
            gain1.gain.linearRampToValueAtTime(0.07, now + 0.05);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            
            gain2.gain.setValueAtTime(0, now);
            gain2.gain.linearRampToValueAtTime(0.05, now + 0.08);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            
            // 连接
            osc1.connect(gain1);
            osc2.connect(gain2);
            gain1.connect(this.audioContext.destination);
            gain2.connect(this.audioContext.destination);
            
            // 开始并停止
            osc1.start(now);
            osc2.start(now + 0.05);
            osc1.stop(now + 0.35);
            osc2.stop(now + 0.3);
        } catch (e) {
            console.warn('播放奖励音效失败:', e);
        }
    }

    // 播放新方块出现的音效 - 进一步优化为更清脆的版本
    playNewTileSound() {
        if (!this.soundEnabled || !this.audioContext) return;

        try {
            const now = this.audioContext.currentTime;
            
            // 主音振荡器
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            // 添加轻微的"叮"音效果
            const pingOsc = this.audioContext.createOscillator();
            const pingGain = this.audioContext.createGain();
            
            // 高通滤波器增强清晰度
            const highpass = this.audioContext.createBiquadFilter();
            highpass.type = 'highpass';
            highpass.frequency.value = 2000;
            highpass.Q.value = 1.5;
            
            // 主音使用正弦波
            oscillator.type = 'sine';
            oscillator.frequency.value = 1800;
            oscillator.frequency.exponentialRampToValueAtTime(1400, now + 0.1);
            
            // "叮"音使用三角波
            pingOsc.type = 'triangle';
            pingOsc.frequency.value = 3200;
            
            // 主音的音量包络
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.04, now + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            
            // "叮"音的音量包络 - 非常短促
            pingGain.gain.setValueAtTime(0, now);
            pingGain.gain.linearRampToValueAtTime(0.02, now + 0.005);
            pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            
            // 连接节点
            oscillator.connect(gainNode);
            pingOsc.connect(pingGain);
            
            gainNode.connect(highpass);
            pingGain.connect(highpass);
            
            highpass.connect(this.audioContext.destination);

            // 开始并停止音效
            oscillator.start(now);
            pingOsc.start(now);
            oscillator.stop(now + 0.15);
            pingOsc.stop(now + 0.06);
        } catch (e) {
            console.warn('播放新方块音效失败:', e);
        }
    }

    // 播放游戏胜利音效
    playWinSound() {
        if (!this.soundEnabled || !this.audioContext) return;

        try {
            const notes = [523.25, 659.25, 783.99, 1046.50]; // 胜利旋律音符频率
            let startTime = this.audioContext.currentTime;

            notes.forEach((freq, index) => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();

                oscillator.type = 'sine';
                oscillator.frequency.value = freq;

                gainNode.gain.setValueAtTime(0.2, startTime);
                gainNode.gain.exponentialRampToValueAtTime(
                    0.01, startTime + 0.3
                );

                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);

                oscillator.start(startTime);
                oscillator.stop(startTime + 0.3);

                startTime += 0.15;
            });
        } catch (e) {
            console.warn('播放胜利音效失败:', e);
        }
    }

    // 播放游戏结束音效
    playGameOverSound() {
        if (!this.soundEnabled || !this.audioContext) return;

        try {
            const notes = [440, 349.23, 293.66, 261.63]; // 失败旋律音符频率
            let startTime = this.audioContext.currentTime;

            notes.forEach((freq, index) => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();

                oscillator.type = 'triangle';
                oscillator.frequency.value = freq;

                gainNode.gain.setValueAtTime(0.2, startTime);
                gainNode.gain.exponentialRampToValueAtTime(
                    0.01, startTime + 0.4
                );

                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);

                oscillator.start(startTime);
                oscillator.stop(startTime + 0.4);

                startTime += 0.2;
            });
        } catch (e) {
            console.warn('播放游戏结束音效失败:', e);
        }
    }

    // 播放按钮点击音效
    playButtonSound() {
        if (!this.soundEnabled || !this.audioContext) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.value = 330;

            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(
                0.01, this.audioContext.currentTime + 0.1
            );

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.1);
        } catch (e) {
            console.warn('播放按钮音效失败:', e);
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

        // 初始化游戏时播放按钮音效
        this.playButtonSound();
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

        // 撤销操作时播放按钮音效
        this.playButtonSound();
    }

    addNewTile() {
        const emptyCells = this.grid.reduce((acc, val, idx) => {
            if (val === 0) acc.push(idx);
            return acc;
        }, []);

        if (emptyCells.length > 0) {
            const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            // 修改为只生成数值为2的方块
            this.grid[randomCell] = 2;
            setTimeout(() => {
                const cells = document.querySelectorAll('.grid-cell');
                cells[randomCell].classList.add('new');

                // 播放新方块出现的音效
                this.playNewTileSound();

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
            // 播放移动音效
            this.playMoveSound();

            // 给予触觉反馈（仅限支持的设备）
            if ('vibrate' in navigator) {
                navigator.vibrate(15); // 轻微振动15ms
            }

            // 标记已经玩过游戏
            if (this.isFirstGame) {
                localStorage.setItem('hasPlayed', 'true');
                this.isFirstGame = false;
            }

            // 等待动画完成后再添加新的瓦片
            // 这里使用setTimeout确保在所有动画完成后执行
            setTimeout(() => {
                this.addNewTile();

                // 确保在添加新瓦片后强制更新视图
                setTimeout(() => {
                    // 强制更新视图（即使有动画正在进行）
                    this.forceUpdateView();

                    // 检查游戏状态
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
                        // 播放游戏结束音效
                        this.playGameOverSound();
                    } else if (this.hasWon()) {
                        this.showWinMessage();
                        // 播放胜利音效
                        this.playWinSound();
                    }
                }, 50);
            }, 100);
        } else {
            // 如果没有移动，显示无效移动指示
            this.showInvalidMove(direction);
        }
    }

    // 添加一个强制更新视图的方法，无视动画状态
    forceUpdateView() {
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

        // 确定滑动方向的CSS类名（左移或右移）
        const slideDirection = needsReverse ? 'slide-right' : 'slide-left';

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

                                // 播放合并音效
                                this.playMergeSound(newValue);

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
                    // 为移动添加方向性滑动动画
                    else if (newValue !== 0) {
                        const animPromise = new Promise(resolve => {
                            setTimeout(() => {
                                const cell = cells[cellIndex];

                                // 使用特定方向的滑动动画类
                                cell.classList.add(slideDirection);

                                // 创建轨迹效果（动画结束后自动消失）
                                setTimeout(() => {
                                    cell.classList.remove(slideDirection);
                                    resolve();
                                }, 600); // 将动画时间调整为600ms，与CSS动画持续时间一致
                            }, 20); // 减少初始延迟，使反应更灵敏
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

        // 确定滑动方向的CSS类名（上移或下移）
        const slideDirection = needsReverse ? 'slide-down' : 'slide-up';

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

                                // 播放合并音效
                                this.playMergeSound(newValue);

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
                    // 为移动添加方向性滑动动画
                    else if (newValue !== 0) {
                        const animPromise = new Promise(resolve => {
                            setTimeout(() => {
                                const cell = cells[cellIndex];

                                // 使用特定方向的滑动动画类
                                cell.classList.add(slideDirection);

                                // 创建轨迹效果（动画结束后自动消失）
                                setTimeout(() => {
                                    cell.classList.remove(slideDirection);
                                    resolve();
                                }, 600); // 将动画时间调整为600ms，与CSS动画持续时间一致
                            }, 20); // 减少初始延迟，使反应更灵敏
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
            // 播放按钮音效
            this.playButtonSound();

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

        // 绑定音效开关按钮事件
        const soundToggle = document.getElementById('soundToggle');
        if (soundToggle) {
            soundToggle.addEventListener('click', () => {
                this.soundEnabled = !this.soundEnabled;
                localStorage.setItem('soundEnabled', this.soundEnabled);
                this.updateSoundButtonState();

                // 切换音效状态时播放反馈音效
                if (this.soundEnabled) {
                    // 确保音频上下文已初始化
                    if (this.audioContext && this.audioContext.state === 'suspended') {
                        this.audioContext.resume();
                    }
                    this.playButtonSound();
                }
            });
        }

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
                        // 达成成就时播放胜利音效
                        if (threshold === 2048) {
                            this.playWinSound();
                        } else {
                            this.playMergeSound(threshold);
                        }
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