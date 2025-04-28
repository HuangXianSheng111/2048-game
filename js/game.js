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
        this.backgroundMusic = null;
        this.isMusicPlaying = false;
        this.initAudioContext();

        this.init();
        this.setupEventListeners();
        this.updateBestScore();
        if (this.isFirstGame) {
            this.showTutorial();
        }

        // 更新音效按钮状态
        this.updateSoundButtonState();

        // 自动开始背景音乐（如果允许）
        if (this.soundEnabled) {
            setTimeout(() => this.startBackgroundMusic(), 1000);
        }
    }

    // 初始化音频上下文
    initAudioContext() {
        try {
            // 创建Web Audio API的AudioContext
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();

            // 创建背景音乐
            this.createBackgroundMusic();

            console.log('音频系统初始化成功');
        } catch (e) {
            console.warn('该浏览器不支持Web Audio API:', e);
            this.soundEnabled = false;
        }
    }

    // 创建背景音乐
    createBackgroundMusic() {
        if (!this.audioContext) return;
        
        try {
            // 创建主背景音乐的合成器
            this.backgroundMusic = {
                isPlaying: false,
                oscillators: [],
                gainNodes: [],
                lfo: null,
                masterGain: this.audioContext.createGain(),
                // 快乐活泼的C大调旋律音符
                notes: [
                    { frequency: 523.25, duration: 1.5, gain: 0.03 },  // C5
                    { frequency: 587.33, duration: 1.5, gain: 0.03 },  // D5
                    { frequency: 659.25, duration: 1.5, gain: 0.03 },  // E5
                    { frequency: 783.99, duration: 1.5, gain: 0.025 }  // G5
                ],
                // 活泼的琶音旋律模式
                arpeggio: [
                    { frequency: 523.25, duration: 0.25, type: 'triangle' },  // C5
                    { frequency: 659.25, duration: 0.25, type: 'triangle' },  // E5
                    { frequency: 783.99, duration: 0.25, type: 'triangle' },  // G5
                    { frequency: 1046.50, duration: 0.25, type: 'triangle' }, // C6
                    { frequency: 783.99, duration: 0.25, type: 'triangle' },  // G5
                    { frequency: 659.25, duration: 0.25, type: 'triangle' }   // E5
                ],
                // 第二套更活泼的琶音旋律，用于交替
                arpeggio2: [
                    { frequency: 659.25, duration: 0.2, type: 'square' },   // E5
                    { frequency: 783.99, duration: 0.2, type: 'square' },   // G5
                    { frequency: 880.00, duration: 0.2, type: 'square' },   // A5
                    { frequency: 1046.50, duration: 0.2, type: 'square' },  // C6
                    { frequency: 880.00, duration: 0.2, type: 'square' },   // A5
                    { frequency: 783.99, duration: 0.2, type: 'square' }    // G5
                ],
                // 鼓点节奏，增加音乐动感
                rhythm: [
                    { frequency: 120, duration: 0.1, gain: 0.15, type: 'sine' },     // 低音鼓
                    { frequency: 0, duration: 0.3, gain: 0 },                        // 休止
                    { frequency: 300, duration: 0.05, gain: 0.05, type: 'square' },  // 嗒
                    { frequency: 0, duration: 0.25, gain: 0 },                       // 休止
                    { frequency: 120, duration: 0.1, gain: 0.15, type: 'sine' },     // 低音鼓
                    { frequency: 300, duration: 0.05, gain: 0.05, type: 'square' }   // 嗒
                ],
                currentArpeggio: 0,  // 用于在两种琶音风格间切换
                melodyVoices: []     // 存储额外的旋律声音
            };
            
            // 设置主音量
            this.backgroundMusic.masterGain.gain.value = 0.2;
            this.backgroundMusic.masterGain.connect(this.audioContext.destination);
            
            // 创建LFO（低频振荡器）用于给背景音乐添加波动感
            this.backgroundMusic.lfo = this.audioContext.createOscillator();
            const lfoGain = this.audioContext.createGain();
            this.backgroundMusic.lfo.frequency.value = 0.3; // 振荡频率
            this.backgroundMusic.lfo.type = 'sine';
            lfoGain.gain.value = 0.1; // 振荡深度
            this.backgroundMusic.lfo.connect(lfoGain);
            lfoGain.connect(this.backgroundMusic.masterGain.gain);
            
        } catch (e) {
            console.warn('创建背景音乐失败:', e);
        }
    }
    
    // 开始播放背景音乐
    startBackgroundMusic() {
        if (!this.soundEnabled || !this.audioContext || !this.backgroundMusic || this.backgroundMusic.isPlaying) return;
        
        try {
            // 如果AudioContext被暂停，恢复它
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            
            this.backgroundMusic.isPlaying = true;
            
            // 重置所有当前的合成器
            this.stopBackgroundMusic(false);
            
            // 启动LFO
            this.backgroundMusic.lfo.start();
            
            // 创建和播放持续的和弦背景
            this.playChordBackground();
            
            // 开始播放琶音旋律
            this.playArpeggioMelody();
            
            // 播放节奏鼓点增加动感
            this.playRhythm();
            
            // 每8秒随机播放一个动感旋律片段
            this.startMelodySegments();
            
            // 定期添加变化的音色
            setInterval(() => {
                if (this.backgroundMusic.isPlaying) {
                    this.addAccent();
                }
            }, 5000);
            
            // 定期切换琶音模式，增加变化
            setInterval(() => {
                if (this.backgroundMusic.isPlaying) {
                    this.backgroundMusic.currentArpeggio = 1 - this.backgroundMusic.currentArpeggio;
                }
            }, 10000);
            
            this.isMusicPlaying = true;
        } catch (e) {
            console.warn('启动背景音乐失败:', e);
            this.backgroundMusic.isPlaying = false;
        }
    }

    // 停止背景音乐
    stopBackgroundMusic(fullStop = true) {
        if (!this.backgroundMusic) return;
        
        try {
            // 停止所有现有的振荡器
            if (this.backgroundMusic.oscillators.length > 0) {
                this.backgroundMusic.oscillators.forEach(osc => {
                    try {
                        osc.stop();
                        osc.disconnect();
                    } catch (e) {
                        // 忽略已经停止的振荡器
                    }
                });
            }
            
            // 清空振荡器和增益节点数组
            this.backgroundMusic.oscillators = [];
            this.backgroundMusic.gainNodes = [];
            
            // 停止所有旋律声音
            if (this.backgroundMusic.melodyVoices.length > 0) {
                this.backgroundMusic.melodyVoices.forEach(voice => {
                    try {
                        if (voice.oscillator) {
                            voice.oscillator.stop();
                            voice.oscillator.disconnect();
                        }
                        if (voice.gainNode) {
                            voice.gainNode.disconnect();
                        }
                    } catch (e) {
                        // 忽略已经停止的振荡器
                    }
                });
                this.backgroundMusic.melodyVoices = [];
            }
            
            // 如果是完全停止，也停止LFO
            if (fullStop && this.backgroundMusic.lfo) {
                try {
                    this.backgroundMusic.lfo.stop();
                    this.backgroundMusic.lfo.disconnect();
                    // 重新创建LFO以备后用
                    this.backgroundMusic.lfo = this.audioContext.createOscillator();
                    const lfoGain = this.audioContext.createGain();
                    this.backgroundMusic.lfo.frequency.value = 0.3;
                    this.backgroundMusic.lfo.type = 'sine';
                    lfoGain.gain.value = 0.1;
                    this.backgroundMusic.lfo.connect(lfoGain);
                    lfoGain.connect(this.backgroundMusic.masterGain.gain);
                } catch (e) {
                    // 忽略已经停止的LFO
                }
            }
            
            if (fullStop) {
                this.backgroundMusic.isPlaying = false;
                this.isMusicPlaying = false;
            }
        } catch (e) {
            console.warn('停止背景音乐失败:', e);
        }
    }
    
    // 播放持续的和弦背景
    playChordBackground() {
        if (!this.backgroundMusic.isPlaying) return;
        
        this.backgroundMusic.notes.forEach(note => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            // 设置音色为明亮的正弦波
            oscillator.type = 'sine';
            oscillator.frequency.value = note.frequency;
            
            // 应用轻微的颤音效果
            const vibratoDepth = 3;
            const vibratoSpeed = 6;
            const vibrato = this.audioContext.createOscillator();
            const vibratoGain = this.audioContext.createGain();
            
            vibrato.type = 'sine';
            vibrato.frequency.value = vibratoSpeed;
            vibratoGain.gain.value = vibratoDepth;
            
            vibrato.connect(vibratoGain);
            vibratoGain.connect(oscillator.frequency);
            vibrato.start();
            
            // 设置音量包络为缓慢淡入
            gainNode.gain.value = 0;
            gainNode.gain.setTargetAtTime(note.gain, this.audioContext.currentTime, 1.5);
            
            // 连接节点
            oscillator.connect(gainNode);
            gainNode.connect(this.backgroundMusic.masterGain);
            
            // 存储以便之后可以停止
            this.backgroundMusic.oscillators.push(oscillator);
            this.backgroundMusic.gainNodes.push(gainNode);
            this.backgroundMusic.oscillators.push(vibrato);
            
            // 开始播放
            oscillator.start();
        });
    }
    
    // 播放琶音旋律
    playArpeggioMelody() {
        if (!this.backgroundMusic.isPlaying) return;
        
        const playNextNote = () => {
            if (!this.backgroundMusic.isPlaying) return;
            
            // 根据当前选择的琶音模式选择音符集
            const arpeggioSet = this.backgroundMusic.currentArpeggio === 0 ? 
                                this.backgroundMusic.arpeggio : 
                                this.backgroundMusic.arpeggio2;
            
            // 随机选择一个音符
            const index = Math.floor(Math.random() * arpeggioSet.length);
            const note = arpeggioSet[index];
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            // 使用指定的音色，默认为triangle
            oscillator.type = note.type || 'triangle';
            oscillator.frequency.value = note.frequency;
            
            // 创建更加活泼的音量包络
            gainNode.gain.value = 0;
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.05);
            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime + note.duration * 0.7);
            gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + note.duration);
            
            // 添加音色滤波器，增强音色
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 2000;
            filter.Q.value = 5;
            
            // 连接节点链
            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.backgroundMusic.masterGain);
            
            // 开始播放
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + note.duration);
            
            // 计划下一个音符
            setTimeout(() => {
                playNextNote();
            }, note.duration * 1000 * 0.8); // 稍微重叠一点，使旋律更连贯
        };
        
        // 开始播放琶音
        playNextNote();
    }
    
    // 播放节奏鼓点
    playRhythm() {
        if (!this.backgroundMusic.isPlaying) return;
        
        let currentIndex = 0;
        
        const playNextBeat = () => {
            if (!this.backgroundMusic.isPlaying) return;
            
            const beat = this.backgroundMusic.rhythm[currentIndex];
            currentIndex = (currentIndex + 1) % this.backgroundMusic.rhythm.length;
            
            if (beat.gain > 0) {  // 只有当增益大于0才播放声音
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.type = beat.type || 'sine';
                oscillator.frequency.value = beat.frequency;
                
                gainNode.gain.setValueAtTime(beat.gain, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(
                    0.001, this.audioContext.currentTime + beat.duration
                );
                
                oscillator.connect(gainNode);
                gainNode.connect(this.backgroundMusic.masterGain);
                
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + beat.duration);
            }
            
            // 安排下一个节拍
            setTimeout(() => {
                playNextBeat();
            }, beat.duration * 1000);
        };
        
        // 开始播放节奏
        playNextBeat();
    }
    
    // 开始播放随机旋律片段
    startMelodySegments() {
        if (!this.backgroundMusic.isPlaying) return;
        
        // 定义几个活泼的旋律片段
        const melodyPatterns = [
            // 欢快上升音阶
            [
                { note: 523.25, duration: 0.15 }, // C5
                { note: 587.33, duration: 0.15 }, // D5
                { note: 659.25, duration: 0.15 }, // E5
                { note: 698.46, duration: 0.15 }, // F5
                { note: 783.99, duration: 0.15 }, // G5
                { note: 880.00, duration: 0.15 }, // A5
                { note: 987.77, duration: 0.15 }, // B5
                { note: 1046.50, duration: 0.2 }  // C6
            ],
            // 活泼的短句
            [
                { note: 659.25, duration: 0.2 },   // E5
                { note: 659.25, duration: 0.1 },   // E5
                { note: 783.99, duration: 0.2 },   // G5
                { note: 783.99, duration: 0.1 },   // G5
                { note: 880.00, duration: 0.25 },  // A5
                { note: 783.99, duration: 0.15 }   // G5
            ],
            // 俏皮的下降旋律
            [
                { note: 987.77, duration: 0.15 },  // B5
                { note: 783.99, duration: 0.15 },  // G5
                { note: 880.00, duration: 0.15 },  // A5
                { note: 659.25, duration: 0.15 },  // E5
                { note: 698.46, duration: 0.15 },  // F5
                { note: 523.25, duration: 0.25 }   // C5
            ]
        ];
        
        // 定期播放随机旋律片段
        const playRandomMelody = () => {
            if (!this.backgroundMusic.isPlaying) return;
            
            // 随机选择一个旋律片段
            const patternIndex = Math.floor(Math.random() * melodyPatterns.length);
            const pattern = melodyPatterns[patternIndex];
            
            // 用适合当前游戏分数的音色
            const oscillatorTypes = ['triangle', 'square', 'sine'];
            const typeIndex = Math.min(
                Math.floor(this.score / 500), 
                oscillatorTypes.length - 1
            );
            
            let startTime = this.audioContext.currentTime;
            let delay = 0;
            
            // 播放选中的旋律片段
            pattern.forEach(note => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.type = oscillatorTypes[typeIndex];
                oscillator.frequency.value = note.note;
                
                // 设置包络
                gainNode.gain.setValueAtTime(0, startTime + delay);
                gainNode.gain.linearRampToValueAtTime(0.12, startTime + delay + 0.05);
                gainNode.gain.setValueAtTime(0.12, startTime + delay + note.duration - 0.05);
                gainNode.gain.linearRampToValueAtTime(0, startTime + delay + note.duration);
                
                oscillator.connect(gainNode);
                gainNode.connect(this.backgroundMusic.masterGain);
                
                oscillator.start(startTime + delay);
                oscillator.stop(startTime + delay + note.duration);
                
                // 保存引用以便可以停止
                this.backgroundMusic.melodyVoices.push({
                    oscillator: oscillator,
                    gainNode: gainNode
                });
                
                delay += note.duration;
            });
            
            // 安排下一个随机旋律片段
            setTimeout(() => {
                playRandomMelody();
            }, (delay * 1000) + Math.random() * 8000 + 4000); // 4-12秒后播放下一个片段
        };
        
        // 开始播放随机旋律片段
        setTimeout(() => {
            playRandomMelody();
        }, 2000); // 2秒后开始第一个片段
    }
    
    // 添加音乐的变化音色（点缀）
    addAccent() {
        if (!this.backgroundMusic.isPlaying) return;
        
        // 根据当前分数选择不同的音调模式
        const baseScoreFreq = 440 + Math.min(this.score / 1000, 1) * 220;
        
        // 随机选择音符
        const possibleNotes = [baseScoreFreq, baseScoreFreq * 5/4, baseScoreFreq * 3/2, baseScoreFreq * 2];
        const noteIndex = Math.floor(Math.random() * possibleNotes.length);
        const frequency = possibleNotes[noteIndex];
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        // 根据游戏进度选择不同的音色
        oscillator.type = this.score > 2000 ? 'square' : 'sine';
        oscillator.frequency.value = frequency;
        
        // 创建更活泼的淡入淡出包络
        gainNode.gain.value = 0;
        gainNode.gain.setTargetAtTime(0.08, this.audioContext.currentTime, 0.3);
        gainNode.gain.setTargetAtTime(0.0001, this.audioContext.currentTime + 1.0, 0.3);
        
        // 连接并播放
        oscillator.connect(gainNode);
        gainNode.connect(this.backgroundMusic.masterGain);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 2.0);
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

    // 创建并播放移动音效
    playMoveSound() {
        if (!this.soundEnabled || !this.audioContext) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(220, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(
                0, this.audioContext.currentTime + 0.2
            );

            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(
                0.01, this.audioContext.currentTime + 0.2
            );

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.2);
        } catch (e) {
            console.warn('播放移动音效失败:', e);
        }
    }

    // 创建并播放合并音效
    playMergeSound(value) {
        if (!this.soundEnabled || !this.audioContext) return;

        try {
            // 基于合并的数字值调整音效
            const baseFrequency = 220;
            // 数字越大，音调越高
            const frequencyMultiplier = 1 + Math.log2(value) * 0.1;
            const frequency = baseFrequency * frequencyMultiplier;

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.type = 'triangle';
            oscillator.frequency.value = frequency;

            gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(
                0.01, this.audioContext.currentTime + 0.3
            );

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.3);
        } catch (e) {
            console.warn('播放合并音效失败:', e);
        }
    }

    // 播放新方块出现的音效
    playNewTileSound() {
        if (!this.soundEnabled || !this.audioContext) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.value = 440;

            gainNode.gain.setValueAtTime(0.05, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(
                0.01, this.audioContext.currentTime + 0.15
            );

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.15);
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
            // 确保新方块只有2，去除随机生成4的可能性
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
                    this.startBackgroundMusic();
                } else {
                    this.stopBackgroundMusic();
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