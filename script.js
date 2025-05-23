// --------------------------------------------------------------------------------
// Game Configuration Variables
// --------------------------------------------------------------------------------

// Core Difficulty Settings
var initialLightDuration = 2000;     // Initial duration a light stays visible (ms). Base: 1800ms.
var minLightDuration = 400;        // Minimum duration a light stays visible at max difficulty (ms).
var durationDecreasePerPoint = 20; // How much the light's visible duration decreases per point scored (ms). Base: 25ms.

var initialSpawnDelay = 350;       // Initial delay before a new light spawns after one is clicked/missed (ms). Base: 300ms.
var minSpawnDelay = 100;           // Minimum spawn delay at max difficulty (ms).
var spawnDelayDecreasePerPoint = 4; // How much the spawn delay decreases per point scored (ms). Base: 5ms.

var maxMissesAllowed = 3;          // Number of misses allowed before game over.
var lightSize = 50;                // Visual size of the light target (px). CSS class .light-target should match.

// Power-up Settings
var slowDownChance = 0.15;         // 15% chance for a slow-down light to spawn.
var extraLifeChance = 0.12;        // 12% chance for an extra life light to spawn.
var slowDownMultiplier = 1.5;      // Factor by which game speed is slowed (e.g., 1.5x slower means durations are 1.5x longer).
var slowDownDuration = 7000;       // Duration of the slow-down effect (ms).

// Visual Settings
var numStars = 150;                // Number of stars in the background. Was 75.
var fireworkTypes = ['classic', 'comet', 'crackle']; // Types of fireworks

// --------------------------------------------------------------------------------
// Global Game State Variables (managed by the script)
// --------------------------------------------------------------------------------
var score;
var misses;
var lightHideTimer; // setTimeout ID for hiding the light
var gameLoopTimer;  // setTimeout ID for the next light spawn
var isPlaying;
var isSlowDownActive = false;
var slowDownEffectTimer = null;
var hasInitialFadeInPlayed = false; // Flag for one-time fade-in animation

// UI State Variables for Power-up Cues
var originalScoreBoardColor;
var originalScoreBoardSpanColor;
var originalScoreBoardSpanTextShadow;

// --------------------------------------------------------------------------------
// DOM Element References (cached for performance)
// --------------------------------------------------------------------------------
var gameArea;               // Reference to the game area div
var scoreDisplay;           // Reference to the score display span
var missesDisplay;          // Reference to the misses count span
var maxMissesDisplay;       // Reference to the max misses display span
var startButton;            // Reference to the start button
var gameOverMessage;        // Reference to the game over message div
var starContainer;          // Reference to the container for background stars

// Sound effect IDs (cached for clarity)
var CLICK_SOUND_ID = 'click-sound';
var POWERUP_SOUND_ID = 'powerup-sound';
var MISS_SOUND_ID = 'miss-sound';
var START_SOUND_ID = 'start-sound';
var GAMEOVER_SOUND_ID = 'gameover-sound';


$(document).ready(function() {
    // Initialize DOM Element References
    gameArea = $('#game-area');
    scoreDisplay = $('#score'); // This is a span for the score value
    missesDisplay = $('#misses-count'); // This is a span for the misses value
    maxMissesDisplay = $('#max-misses'); // This is a span for the max misses value
    startButton = $('#start-button');
    gameOverMessage = $('#game-over-message');
    // starContainer is initialized in setupBackgroundStars

    // Store original scoreboard colors (ensure elements exist)
    if ($('#score-board').length && $('#score-board span').length) {
        originalScoreBoardColor = $('#score-board').css('color'); // Color of the label parts
        originalScoreBoardSpanColor = $('#score-board span').first().css('color'); // Color of the number spans
        originalScoreBoardSpanTextShadow = $('#score-board span').first().css('text-shadow');
    } else {
        // Fallback default colors if DOM isn't ready or structure is unexpected
        originalScoreBoardColor = '#8888cc';
        originalScoreBoardSpanColor = '#ffffff';
        originalScoreBoardSpanTextShadow = '0 0 3px #fff, 0 0 5px #a0a0ff';
    }

    // Initial "Darkness Engulfing" animation
    if (!hasInitialFadeInPlayed) {
        $('#game-container').css('opacity', 1);
        hasInitialFadeInPlayed = true;
    }

    // Helper functions for dynamic speed calculation
    function getBaseLightDuration(currentScore) {
        return Math.max(minLightDuration, initialLightDuration - (currentScore * durationDecreasePerPoint));
    }

    function getBaseSpawnDelay(currentScore) {
        return Math.max(minSpawnDelay, initialSpawnDelay - (currentScore * spawnDelayDecreasePerPoint));
    }

    function getEffectiveLightDuration(currentScore) {
        var duration = getBaseLightDuration(currentScore);
        if (isSlowDownActive) {
            duration *= slowDownMultiplier;
        }
        return duration;
    }

    function getEffectiveSpawnDelay(currentScore) {
        var delay = getBaseSpawnDelay(currentScore);
        if (isSlowDownActive) {
            delay *= slowDownMultiplier;
        }
        return delay;
    }
    
    function restoreOriginalScoreboardColors() {
        if (originalScoreBoardColor && originalScoreBoardSpanColor) { 
            $('#score-board').css('color', originalScoreBoardColor);
            $('#score-board span').css('color', originalScoreBoardSpanColor);
            $('#score-board span').css('text-shadow', originalScoreBoardSpanTextShadow);
        } else { // Fallback if original colors weren't captured
            $('#score-board').css('color', '#8888cc'); 
            $('#score-board span').css('color', '#fff');   
            $('#score-board span').css('text-shadow', '0 0 3px #fff, 0 0 5px #a0a0ff'); 
        }
    }

    function initGame() {
        score = 0;
        misses = 0;
        isPlaying = false;
        isSlowDownActive = false; 
        clearTimeout(slowDownEffectTimer); 
        
        updateScoreDisplay();
        missesDisplay.text(misses);
        maxMissesDisplay.text(maxMissesAllowed);
        
        gameOverMessage.removeClass('game-over-visible').hide(); 
        startButton.text('시작!').show().removeAttr('disabled');
        
        gameArea.find('.light-target').remove(); 
        gameArea.find('.firework-particle').remove(); 
        
        clearTimeout(lightHideTimer);
        clearTimeout(gameLoopTimer);
        
        // Reset visual cues
        gameArea.css('border-color', '#4a4a6a'); // Original game area border
        restoreOriginalScoreboardColors(); // Restore scoreboard colors
    }

    function startGame() {
        if (isPlaying) return;
        
        initGame(); 
        isPlaying = true;
        startButton.text('게임 중...').attr('disabled', 'disabled');
        playSound(START_SOUND_ID);
        
        spawnLight(); 
    }

    function playSound(soundId) {
        var soundElement = $('#' + soundId);
        if (soundElement.length && typeof soundElement.get(0).play === 'function') { 
            soundElement.get(0).currentTime = 0; 
            try {
                var playPromise = soundElement.get(0).play();
                if (playPromise !== undefined) {
                    playPromise.then(function() {
                        // Playback started
                    }).catch(function(error) {
                        // Playback failed
                    });
                }
            } catch (e) {
                // Exception playing sound
            }
        }
    }

    function spawnLight() {
        if (!isPlaying) return;

        gameArea.find('.light-target').remove();
        clearTimeout(lightHideTimer); 

        var light = $('<div class="light-target"></div>');
        var randomVal = Math.random();
        var isExtraLifeLight = false;
        var isSlowDownLight = false;

        if (randomVal < extraLifeChance) {
            isExtraLifeLight = true;
            light.addClass('extra-life-light');
        } else if (randomVal < extraLifeChance + slowDownChance) {
            isSlowDownLight = true;
            light.addClass('slow-down-light');
        }
        
        var gameAreaWidth = gameArea.width();
        var gameAreaHeight = gameArea.height();
        
        var maxX = gameAreaWidth - lightSize;
        var maxY = gameAreaHeight - lightSize;

        var randomX = Math.floor(Math.random() * maxX);
        var randomY = Math.floor(Math.random() * maxY);

        light.css({
            left: randomX + (lightSize * 0.45) + 'px',
            top: randomY + (lightSize * 0.45) + 'px',
            width: lightSize * 0.1 + 'px',
            height: lightSize * 0.1 + 'px',
            opacity: 0
        });

        if (!isExtraLifeLight && !isSlowDownLight) {
            var colors = ['#00ffff', '#39FF14', '#FFD700', '#FF00FF', '#007FFF']; 
            var randomColor = colors[Math.floor(Math.random() * colors.length)];
            light.css({
                backgroundColor: randomColor,
                boxShadow: '0 0 5px ' + randomColor + ', 0 0 10px ' + randomColor + ', 0 0 20px ' + randomColor + ', 0 0 30px ' + randomColor + ', 0 0 40px ' + randomColor
            });
        }

        gameArea.append(light);
        
        light.animate({
            width: lightSize + 'px',
            height: lightSize + 'px',
            left: randomX + 'px',
            top: randomY + 'px',
            opacity: 1
        }, 150);

        light.one('click', function() {
            if (!isPlaying) return;

            score++;
            updateScoreDisplay();
            
            var clickedLight = $(this);
            var lightPos = clickedLight.position(); 
            var lightWidth = clickedLight.width();
            var lightHeight = clickedLight.height();
            var centerX = lightPos.left + lightWidth / 2;
            var centerY = lightPos.top + lightHeight / 2;

            if (clickedLight.hasClass('extra-life-light') || clickedLight.hasClass('slow-down-light')) {
                playSound(POWERUP_SOUND_ID);
                if (clickedLight.hasClass('extra-life-light')) {
                    activateExtraLifePowerUp();
                } else { 
                    activateSlowDownPowerUp();
                }
            } else {
                playSound(CLICK_SOUND_ID);
            }
            
            clickedLight.remove(); 
            
            var selectedType = fireworkTypes[Math.floor(Math.random() * fireworkTypes.length)];
            createFirework(selectedType, centerX, centerY);
            
            clearTimeout(lightHideTimer); 
            gameLoopTimer = setTimeout(spawnLight, getEffectiveSpawnDelay(score));
        });

        lightHideTimer = setTimeout(function() {
            if (!isPlaying) return; 
            
            var targetWidth = lightSize * 0.1;
            var targetHeight = lightSize * 0.1;
            var currentCssLeft = light.css('left');
            var currentCssTop = light.css('top');
            var currentLeft = parseInt(currentCssLeft, 10) || 0;
            var currentTop = parseInt(currentCssTop, 10) || 0;
            var newLeft = currentLeft + (lightSize - targetWidth) / 2;
            var newTop = currentTop + (lightSize - targetHeight) / 2;

            light.animate({
                width: targetWidth + 'px',
                height: targetHeight + 'px',
                left: newLeft + 'px',
                top: newTop + 'px',
                opacity: 0
            }, 150, function() {
                $(this).remove();
            });
            
            misses++;
            missesDisplay.text(misses);
            playSound(MISS_SOUND_ID);

            if (misses >= maxMissesAllowed) {
                endGame();
            } else {
                gameLoopTimer = setTimeout(spawnLight, getEffectiveSpawnDelay(score));
            }
        }, getEffectiveLightDuration(score)); 
    }

    function updateScoreDisplay() {
        // This function only updates the score number, not the misses or max misses.
        // The #score span is directly targeted.
        scoreDisplay.text(score);
    }

    function endGame() {
        isPlaying = false;
        isSlowDownActive = false; 
        clearTimeout(lightHideTimer);
        clearTimeout(gameLoopTimer);
        clearTimeout(slowDownEffectTimer); 
        
        // Reset visual cues
        gameArea.css('border-color', '#4a4a6a'); 
        restoreOriginalScoreboardColors(); // Restore scoreboard colors

        gameArea.find('.light-target').remove(); 
        gameArea.find('.firework-particle').remove(); 
        playSound(GAMEOVER_SOUND_ID);
        
        gameOverMessage.html('게임 오버!<br>최종 점수: ' + score).addClass('game-over-visible').show(); 
        startButton.text('다시 시작').show().removeAttr('disabled');
    }

    startButton.on('click', startGame);
    initGame(); // Initial setup

    var resizeTimer; 
    $(window).on('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            if (gameArea && gameArea.length) { 
                setupBackgroundStars();
            }
        }, 250); 
    });

    function activateExtraLifePowerUp() {
        if (misses > 0) {
            misses--;
            missesDisplay.text(misses); // Update misses display
            var originalMissesColor = missesDisplay.css('color'); // This is a span
            // The #score-board also contains the "놓친 횟수:" label.
            // For consistency, we might want to flash the label too, or just the number.
            // The current CSS targets #score-board span for numbers.
            missesDisplay.css('color', '#39FF14'); 
            setTimeout(function() {
                missesDisplay.css('color', originalMissesColor); // Revert only the number's color
            }, 300);
        }
    }

    function activateSlowDownPowerUp() {
        if (isSlowDownActive) return; 
        isSlowDownActive = true;
        
        // New visual cue: Change scoreboard color
        $('#score-board').css('color', '#81D4FA'); // Light blue for labels (e.g., "점수:", "놓친 횟수:")
        $('#score-board span').css('color', '#E1F5FE'); // Very light blue/white for numbers
        $('#score-board span').css('text-shadow', '0 0 3px #E1F5FE, 0 0 8px #81D4FA'); // Blueish glow for numbers

        clearTimeout(slowDownEffectTimer); 
        slowDownEffectTimer = setTimeout(deactivateSlowDownPowerUp, slowDownDuration);
    }

    function deactivateSlowDownPowerUp() {
        isSlowDownActive = false;
        clearTimeout(slowDownEffectTimer);
        
        // Revert scoreboard color to original by calling the shared function
        restoreOriginalScoreboardColors();
    }

    function setupBackgroundStars() {
        starContainer = $('#star-container');
        if (!starContainer.length) { 
            starContainer = $('<div id="star-container"></div>').css({
                position: 'absolute',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                pointerEvents: 'none' 
            });
            gameArea.prepend(starContainer); 
        }
        starContainer.empty(); 

        var gameAreaWidth = gameArea.width();
        var gameAreaHeight = gameArea.height();

        for (var i = 0; i < numStars; i++) {
            var star = $('<div></div>').addClass('star');
            var starSize = Math.random() * 2 + 1; 
            var starAnimationDuration = Math.random() * 2 + 1; 
            var starAnimationDelay = Math.random() * 3; 

            star.css({
                position: 'absolute',
                left: Math.random() * gameAreaWidth + 'px',
                top: Math.random() * gameAreaHeight + 'px',
                width: starSize + 'px',
                height: starSize + 'px',
                backgroundColor: 'rgba(255, 255, 220, 0.8)', 
                borderRadius: '50%',
                opacity: 0, 
                animationName: 'twinkle',
                animationDuration: starAnimationDuration + 's',
                animationDelay: starAnimationDelay + 's',
                animationIterationCount: 'infinite',
                animationTimingFunction: 'ease-in-out'
            });
            starContainer.append(star);
        }
    }
    setupBackgroundStars(); 
    
    function createFirework(type, originX, originY) {
        var numParticles, colors, particleSizeRange, distanceRange, durationRange, gravityEffect;

        switch (type) {
            case 'classic':
                numParticles = 18 + Math.floor(Math.random() * 5); 
                colors = ['#FFD700', '#FFA500', '#FFFF00', '#FF8C00']; 
                particleSizeRange = { min: 3, max: 6 };
                distanceRange = { min: 60, max: 120 };
                durationRange = { min: 500, max: 800 };
                gravityEffect = 0; 
                break;
            case 'comet':
                numParticles = 12 + Math.floor(Math.random() * 7); 
                colors = ['#87CEFA', '#ADD8E6', '#B0E0E6', '#AFEEEE']; 
                particleSizeRange = { min: 4, max: 7 };
                distanceRange = { min: 70, max: 130 };
                durationRange = { min: 600, max: 900 };
                gravityEffect = 0.3; 
                break;
            case 'crackle':
                numParticles = 20 + Math.floor(Math.random() * 6); 
                colors = ['#FF4500', '#32CD32', '#1E90FF', '#FF00FF', '#FFFF00', '#00FFFF']; 
                particleSizeRange = { min: 2, max: 5 };
                distanceRange = { min: 50, max: 100 };
                durationRange = { min: 400, max: 700 };
                gravityEffect = 0.1; 
                break;
            default: 
                numParticles = 18 + Math.floor(Math.random() * 5);
                colors = ['#FFD700', '#FFA500', '#FFFF00', '#FF8C00'];
                particleSizeRange = { min: 3, max: 6 };
                distanceRange = { min: 60, max: 120 };
                durationRange = { min: 500, max: 800 };
                gravityEffect = 0;
                break;
        }

        for (var i = 0; i < numParticles; i++) {
            (function(index) { 
                var particle = $('<div></div>').addClass('firework-particle');
                var angle = Math.random() * Math.PI * 2;
                
                if (type === 'comet') { 
                    angle = (Math.random() * Math.PI * 1.2) - (Math.PI * 0.1); 
                }

                var distance = distanceRange.min + Math.random() * (distanceRange.max - distanceRange.min);
                var duration = durationRange.min + Math.random() * (durationRange.max - durationRange.min);
                var particleSize = particleSizeRange.min + Math.random() * (particleSizeRange.max - particleSizeRange.min);

                particle.css({
                    left: originX + 'px',
                    top: originY + 'px',
                    width: particleSize + 'px',
                    height: particleSize + 'px',
                    backgroundColor: colors[Math.floor(Math.random() * colors.length)],
                    opacity: 1 
                });

                gameArea.append(particle);

                var targetX = originX + Math.cos(angle) * distance;
                var targetY = originY - Math.sin(angle) * distance + (gravityEffect * duration * 0.1); 

                particle.animate({
                    left: targetX + 'px',
                    top: targetY + 'px',
                    opacity: 0
                }, duration, function() {
                    $(this).remove();
                    if (type === 'crackle' && Math.random() < 0.3) { 
                        var popParticle = $('<div></div>').addClass('firework-particle');
                        popParticle.css({
                            left: targetX + 'px',
                            top: targetY + 'px',
                            width: particleSize * 0.75 + 'px',
                            height: particleSize * 0.75 + 'px',
                            backgroundColor: colors[Math.floor(Math.random() * colors.length)],
                            opacity: 0.7 
                        });
                        gameArea.append(popParticle);
                        popParticle.animate({ opacity: 0 }, 100 + Math.random() * 100, function() { $(this).remove(); });
                    }
                });
            })(i);
        }
    }
});
