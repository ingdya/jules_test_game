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
    scoreDisplay = $('#score');
    missesDisplay = $('#misses-count');
    maxMissesDisplay = $('#max-misses');
    startButton = $('#start-button');
    gameOverMessage = $('#game-over-message');
    // starContainer is initialized in setupBackgroundStars

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

    function initGame() {
        score = 0;
        misses = 0;
        isPlaying = false;
        isSlowDownActive = false; // Reset power-up state
        clearTimeout(slowDownEffectTimer); // Clear any active power-up timer
        // TODO: Reset visual cue for power-up if added later (e.g., gameArea border)
        
        updateScoreDisplay();
        missesDisplay.text(misses);
        maxMissesDisplay.text(maxMissesAllowed);
        
        gameOverMessage.removeClass('game-over-visible').hide(); // Reset and hide
        startButton.text('시작!').show().removeAttr('disabled');
        
        gameArea.find('.light-target').remove(); // Remove only light targets
        // Stars are persistent, so they are not removed here.
        
        clearTimeout(lightHideTimer);
        clearTimeout(gameLoopTimer);
        // Reset game area border if it was changed by power-up
        gameArea.css('border-color', '#4a4a6a'); 
    }

    function startGame() {
        if (isPlaying) return;
        
        initGame(); // 게임 상태 초기화
        isPlaying = true;
        startButton.text('게임 중...').attr('disabled', 'disabled');
        playSound(START_SOUND_ID);
        
        spawnLight(); // 첫 번째 빛 생성
    }

    function playSound(soundId) {
        var soundElement = $('#' + soundId);
        if (soundElement.length && typeof soundElement.get(0).play === 'function') { // Check if play is a function
            soundElement.get(0).currentTime = 0; // Rewind to start
            try {
                var playPromise = soundElement.get(0).play();
                if (playPromise !== undefined) {
                    playPromise.then(function() {
                        // Automatic playback started!
                    }).catch(function(error) {
                        // Automatic playback failed.
                        // This can happen if the user hasn't interacted with the page yet in some browsers.
                        // console.log("Playback failed for " + soundId + ": " + error);
                    });
                }
            } catch (e) {
                // console.log("Exception playing sound " + soundId + ": " + e);
            }
        }
    }

    function spawnLight() {
        if (!isPlaying) return;

        // 이전 타겟이 남아있다면 제거 (타임아웃 전에 다음 호출된 경우 등)
        gameArea.find('.light-target').remove();
        clearTimeout(lightHideTimer); // 이전 빛의 자동 숨김 타이머 제거

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
        // else it's a normal light
        
        var gameAreaWidth = gameArea.width();
        var gameAreaHeight = gameArea.height();
        
        var maxX = gameAreaWidth - lightSize;
        var maxY = gameAreaHeight - lightSize;

        var randomX = Math.floor(Math.random() * maxX);
        var randomY = Math.floor(Math.random() * maxY);

        // Basic styling for position and initial small size/opacity
        light.css({
            left: randomX + (lightSize * 0.45) + 'px',
            top: randomY + (lightSize * 0.45) + 'px',
            width: lightSize * 0.1 + 'px',
            height: lightSize * 0.1 + 'px',
            opacity: 0
        });

        if (!isExtraLifeLight && !isSlowDownLight) {
            // 다양한 네온 색상 중 하나를 무작위로 선택 (for normal lights)
            var colors = ['#00ffff', '#39FF14', '#FFD700', '#FF00FF', '#007FFF']; // Aqua, Neon Green, Gold, Magenta, Azure
            var randomColor = colors[Math.floor(Math.random() * colors.length)];
            light.css({
                backgroundColor: randomColor,
                boxShadow: '0 0 5px ' + randomColor + ', 0 0 10px ' + randomColor + ', 0 0 20px ' + randomColor + ', 0 0 30px ' + randomColor + ', 0 0 40px ' + randomColor
            });
        }
        // For .extra-life-light or .slow-down-light, CSS classes will handle background and shadow

        gameArea.append(light);
        
        // "Pop" and fade-in effect
        light.animate({
            width: lightSize + 'px',
            height: lightSize + 'px',
            left: randomX + 'px',
            top: randomY + 'px',
            opacity: 1
        }, 150);

        // jQuery 1.7.1은 .one()이 있으므로 사용. 클릭 이벤트 한 번만 바인딩
        light.one('click', function() {
            if (!isPlaying) return;

            score++;
            updateScoreDisplay();

            if ($(this).hasClass('extra-life-light') || $(this).hasClass('slow-down-light')) {
                playSound(POWERUP_SOUND_ID);
                if ($(this).hasClass('extra-life-light')) {
                    activateExtraLifePowerUp();
                } else { // Must be slow-down-light
                    activateSlowDownPowerUp();
                }
            } else {
                playSound(CLICK_SOUND_ID);
            }
            
            // 클릭 성공 시 효과 (살짝 커졌다가 사라짐)
            $(this).stop().animate({
                width: lightSize * 1.2 + 'px',
                height: lightSize * 1.2 + 'px',
                opacity: 0,
                marginLeft: -lightSize * 0.1 + 'px', // 중앙 유지하며 커지도록
                marginTop: -lightSize * 0.1 + 'px'
            }, 100, function() {
                $(this).remove();
            });
            
            clearTimeout(lightHideTimer); // 성공했으니 자동 숨김 타이머 제거

            // 다음 빛 생성 (점수에 따라 빨라지는 딜레이 적용)
            gameLoopTimer = setTimeout(spawnLight, getEffectiveSpawnDelay(score));
        });

        // 현재 점수에 따라 빛이 머무는 시간 조절
        lightHideTimer = setTimeout(function() {
            if (!isPlaying) return; // 게임 종료 시 타이머 무시
            
            // Shrink and fade-out effect when missed
            var targetWidth = lightSize * 0.1;
            var targetHeight = lightSize * 0.1;
            
            // Ensure we parse the current CSS values correctly
            var currentCssLeft = light.css('left');
            var currentCssTop = light.css('top');

            // Default to 0 if parsing fails or values are unexpected (e.g., 'auto')
            var currentLeft = parseInt(currentCssLeft, 10) || 0;
            var currentTop = parseInt(currentCssTop, 10) || 0;

            // It's important to use the original lightSize for centering calculation,
            // as the light.width() might already be affected if an animation was interrupted.
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
                // 놓쳤을 경우에도 다음 빛 생성 (딜레이는 성공시와 동일하게 적용)
                gameLoopTimer = setTimeout(spawnLight, getEffectiveSpawnDelay(score));
            }
        }, getEffectiveLightDuration(score)); // Use effective duration for hide timer
    }

    function updateScoreDisplay() {
        scoreDisplay.text(score);
    }

    function endGame() {
        isPlaying = false;
        isSlowDownActive = false; // Reset power-up state
        clearTimeout(lightHideTimer);
        clearTimeout(gameLoopTimer);
        clearTimeout(slowDownEffectTimer); // Clear any active power-up timer
        // Reset game area border if it was changed by power-up
        gameArea.css('border-color', '#4a4a6a'); 
        
        // 화면에 남아있을 수 있는 타겟 제거
        gameArea.find('.light-target').stop().remove(); 
        playSound(GAMEOVER_SOUND_ID);
        
        gameOverMessage.html('게임 오버!<br>최종 점수: ' + score).addClass('game-over-visible').show(); // Add class and show
        startButton.text('다시 시작').show().removeAttr('disabled');
    }

    // 이벤트 리스너 바인딩 (jQuery 1.7.1은 .on() 사용 가능)
    startButton.on('click', startGame);

    // 초기화면 설정
    initGame();

    function activateExtraLifePowerUp() {
        if (misses > 0) {
            misses--;
            missesDisplay.text(misses);
            // Visual cue: Flash misses display
            var originalColor = missesDisplay.css('color');
            missesDisplay.css('color', '#39FF14'); // Neon Green
            setTimeout(function() {
                missesDisplay.css('color', originalColor);
            }, 300);
        }
    }

    function activateSlowDownPowerUp() {
        if (isSlowDownActive) return; // Already active or re-trigger avoided for now
        isSlowDownActive = true;
        
        // Optional: Visual cue
        gameArea.css('border-color', '#81D4FA'); // Light blue border

        clearTimeout(slowDownEffectTimer); // Clear any existing timer
        slowDownEffectTimer = setTimeout(deactivateSlowDownPowerUp, slowDownDuration);
    }

    function deactivateSlowDownPowerUp() {
        isSlowDownActive = false;
        clearTimeout(slowDownEffectTimer);
        
        // Optional: Revert visual cue
        gameArea.css('border-color', '#4a4a6a'); // Reset to original border color
        
        // Note: The game speed will naturally adjust back because 
        // getEffectiveLightDuration and getEffectiveSpawnDelay will no longer apply the multiplier.
        // If a light is currently visible, its hide timer would have been set with the slowed duration.
        // This is generally fine. The next light will use normal speed.
    }

    function setupBackgroundStars() {
        starContainer = $('#star-container');
        if (!starContainer.length) { // Create container if it doesn't exist
            starContainer = $('<div id="star-container"></div>').css({
                position: 'absolute',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                pointerEvents: 'none' // Stars should not interfere with clicks
            });
            gameArea.prepend(starContainer); // Add to gameArea, behind targets
        }
        starContainer.empty(); // Clear any previous stars if function is called again (though it won't be in this setup)

        var numberOfStars = 75;
        var gameAreaWidth = gameArea.width();
        var gameAreaHeight = gameArea.height();

        for (var i = 0; i < numberOfStars; i++) {
            var star = $('<div></div>').addClass('star');
            var starSize = Math.random() * 2 + 1; // Size between 1px and 3px
            var starOpacity = Math.random() * 0.5 + 0.2; // Max opacity between 0.2 and 0.7
            var starAnimationDuration = Math.random() * 2 + 1; // Duration between 1s and 3s
            var starAnimationDelay = Math.random() * 3; // Delay up to 3s

            star.css({
                position: 'absolute',
                left: Math.random() * gameAreaWidth + 'px',
                top: Math.random() * gameAreaHeight + 'px',
                width: starSize + 'px',
                height: starSize + 'px',
                backgroundColor: 'rgba(255, 255, 220, 0.8)', // Faint light yellow
                borderRadius: '50%',
                opacity: 0, // Start invisible, animation will take over
                // Directly set animation properties here for simplicity with jQuery 1.7.1
                animationName: 'twinkle',
                animationDuration: starAnimationDuration + 's',
                animationDelay: starAnimationDelay + 's',
                animationIterationCount: 'infinite',
                animationTimingFunction: 'ease-in-out'
                // We'll need a way to pass starOpacity to the keyframes,
                // or create dynamic keyframes per star, which is complex.
                // For now, CSS keyframes will use a fixed max opacity.
                // A better approach if possible would be to use CSS custom properties,
                // but direct support in jQuery 1.7.1 for setting them is not straightforward.
            });
            // Store max opacity for potential use if we refine animation
            star.data('max-opacity', starOpacity); 

            starContainer.append(star);
        }
    }

    setupBackgroundStars(); // Create stars on initial load
    
    // Optional: Resize stars if window resizes. For now, keep it simple.
    // $(window).on('resize', setupBackgroundStars); 
});
