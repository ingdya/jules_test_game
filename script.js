$(document).ready(function() {
    var gameArea = $('#game-area');
    var scoreDisplay = $('#score');
    var missesDisplay = $('#misses-count');
    var maxMissesDisplay = $('#max-misses');
    var startButton = $('#start-button');
    var gameOverMessage = $('#game-over-message');

    var score;
    var misses;
    var lightHideTimer; // 빛 숨김 setTimeout ID
    var gameLoopTimer;  // 다음 빛 생성 setTimeout ID
    var isPlaying;

    // 게임 설정값
    var initialLightDuration = 1800; // 빛이 보이는 초기 시간 (ms)
    var minLightDuration = 400;   // 빛이 보이는 최소 시간 (ms)
    var durationDecreasePerPoint = 25; // 1점당 줄어드는 시간 (ms)
    
    var initialSpawnDelay = 300; // 빛 클릭 후 다음 빛 생성까지 딜레이 (ms)
    var minSpawnDelay = 100;
    var spawnDelayDecreasePerPoint = 5;

    var maxMissesAllowed = 3;
    var lightSize = 50; // CSS .light-target width/height와 동일

    function initGame() {
        score = 0;
        misses = 0;
        isPlaying = false;
        
        updateScoreDisplay();
        missesDisplay.text(misses);
        maxMissesDisplay.text(maxMissesAllowed);
        
        gameOverMessage.hide();
        startButton.text('시작!').show().removeAttr('disabled');
        
        gameArea.empty(); // 이전 게임의 타겟들 제거
        clearTimeout(lightHideTimer);
        clearTimeout(gameLoopTimer);
    }

    function startGame() {
        if (isPlaying) return;
        
        initGame(); // 게임 상태 초기화
        isPlaying = true;
        startButton.text('게임 중...').attr('disabled', 'disabled');
        
        spawnLight(); // 첫 번째 빛 생성
    }

    function spawnLight() {
        if (!isPlaying) return;

        // 이전 타겟이 남아있다면 제거 (타임아웃 전에 다음 호출된 경우 등)
        gameArea.find('.light-target').remove();
        clearTimeout(lightHideTimer); // 이전 빛의 자동 숨김 타이머 제거

        var light = $('<div class="light-target"></div>');
        
        var gameAreaWidth = gameArea.width();
        var gameAreaHeight = gameArea.height();
        
        var maxX = gameAreaWidth - lightSize;
        var maxY = gameAreaHeight - lightSize;

        var randomX = Math.floor(Math.random() * maxX);
        var randomY = Math.floor(Math.random() * maxY);

        // 다양한 네온 색상 중 하나를 무작위로 선택
        var colors = ['#00ffff', '#39FF14', '#FFD700', '#FF00FF', '#007FFF']; // Aqua, Neon Green, Gold, Magenta, Azure
        var randomColor = colors[Math.floor(Math.random() * colors.length)];

        light.css({
            left: randomX + 'px',
            top: randomY + 'px',
            backgroundColor: randomColor, // 무작위 색상 적용
            boxShadow: '0 0 5px ' + randomColor + ', 0 0 10px ' + randomColor + ', 0 0 20px ' + randomColor + ', 0 0 30px ' + randomColor + ', 0 0 40px ' + randomColor
        });

        gameArea.append(light);
        // jQuery 1.7.1 animate로 opacity 조절 (fadeIn 효과)
        light.animate({ opacity: 1 }, 150); 

        // jQuery 1.7.1은 .one()이 있으므로 사용. 클릭 이벤트 한 번만 바인딩
        light.one('click', function() {
            if (!isPlaying) return;

            score++;
            updateScoreDisplay();
            
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
            var currentSpawnDelay = Math.max(minSpawnDelay, initialSpawnDelay - (score * spawnDelayDecreasePerPoint));
            gameLoopTimer = setTimeout(spawnLight, currentSpawnDelay);
        });

        // 현재 점수에 따라 빛이 머무는 시간 조절
        var currentLightDuration = Math.max(minLightDuration, initialLightDuration - (score * durationDecreasePerPoint));

        lightHideTimer = setTimeout(function() {
            if (!isPlaying) return; // 게임 종료 시 타이머 무시
            
            // 클릭하지 못했을 때 타겟 제거 (fadeOut 효과)
            light.animate({ opacity: 0 }, 150, function() {
                $(this).remove();
            });
            
            misses++;
            missesDisplay.text(misses);

            if (misses >= maxMissesAllowed) {
                endGame();
            } else {
                // 놓쳤을 경우에도 다음 빛 생성 (딜레이는 성공시와 동일하게 적용)
                var currentSpawnDelay = Math.max(minSpawnDelay, initialSpawnDelay - (score * spawnDelayDecreasePerPoint));
                gameLoopTimer = setTimeout(spawnLight, currentSpawnDelay);
            }
        }, currentLightDuration);
    }

    function updateScoreDisplay() {
        scoreDisplay.text(score);
    }

    function endGame() {
        isPlaying = false;
        clearTimeout(lightHideTimer);
        clearTimeout(gameLoopTimer);
        
        // 화면에 남아있을 수 있는 타겟 제거
        gameArea.find('.light-target').stop().remove(); 
        
        gameOverMessage.html('게임 오버!<br>최종 점수: ' + score).show();
        startButton.text('다시 시작').show().removeAttr('disabled');
    }

    // 이벤트 리스너 바인딩 (jQuery 1.7.1은 .on() 사용 가능)
    startButton.on('click', startGame);

    // 초기화면 설정
    initGame();
});
