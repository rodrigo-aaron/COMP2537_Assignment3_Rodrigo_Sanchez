const POKEAPI_LIST_URL = "https://pokeapi.co/api/v2/pokemon?limit=1500";
const POKEAPI_DETAIL_URL = "https://pokeapi.co/api/v2/pokemon/";

let firstCard = null;
let secondCard = null;
let lockBoard = false;
let matchedPairs = 0;
let totalPairs = 0;
let clicks = 0;
let timerInterval;
let timeLeft = 0;
let timeElapsed = 0; 
let gameStarted = false;
let powerUpActive = false;
let consecutiveMatches = 0;
let currentDifficulty = 'easy'; 

const difficultySettings = {
    easy: {
        cards: 6, // 6 pairs
        time: 10, 
        grid: 'easy'
    },
    medium: {
        cards: 12, // 10 pairs
        time: 150, 
        grid: 'medium'
    },
    hard: {
        cards: 30, // 15 pairs
        time: 200, 
        grid: 'hard'
    }
};

async function fetchPokemonImages(numberOfCards) {
    const response = await fetch(POKEAPI_LIST_URL);
    const data = await response.json();
    const allPokemon = data.results;

    const selectedPokemon = [];
    const pokemonIDs = new Set(); 

    while (selectedPokemon.length < numberOfCards / 2) {
        const randomIndex = Math.floor(Math.random() * allPokemon.length);
        const pokemonName = allPokemon[randomIndex].name;
        const pokemonUrl = allPokemon[randomIndex].url;
        const pokemonId = pokemonUrl.split('/').slice(-2, -1)[0];

        const detailResponse = await fetch(`${POKEAPI_DETAIL_URL}${pokemonId}/`);
        const detailData = await detailResponse.json();
        const imageUrl = detailData.sprites.other['official-artwork']?.front_default; 

        if (imageUrl && !pokemonIDs.has(pokemonId)) {
            selectedPokemon.push({
                name: pokemonName,
                id: pokemonId,
                imageUrl: imageUrl
            });
            pokemonIDs.add(pokemonId);
        }
    }

    const cardImages = [];
    selectedPokemon.forEach(pokemon => {
        cardImages.push(pokemon.imageUrl);
        cardImages.push(pokemon.imageUrl); 
    });

    for (let i = cardImages.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cardImages[i], cardImages[j]] = [cardImages[j], cardImages[i]];
    }

    return cardImages;
}

function createCards(images) {
    const gameGrid = $('#game_grid');
    gameGrid.empty(); 
    totalPairs = images.length / 2;
    updateStatus();

    images.forEach((imageUrl, index) => {
        const card = $(`
            <div class="card">
                <img id="img${index}" class="front_face" src="${imageUrl}">
                <img class="back_face" src="back.webp">
            </div>
        `);
        card.on('click', flipCard);
        gameGrid.append(card);
    });
}

function flipCard() {
    if (lockBoard) return; 
    if ($(this).hasClass('flip') || $(this).hasClass('matched')) return;

    $(this).toggleClass('flip');
    clicks++;
    updateStatus();

    if (!firstCard) {
        firstCard = $(this);
        return;
    }

    secondCard = $(this);
    lockBoard = true;

    checkForMatch();
}

function checkForMatch() {
    const isMatch = firstCard.find('.front_face').attr('src') === secondCard.find('.front_face').attr('src');

    isMatch ? disableCards() : unflipCards();
}

function disableCards() {
    firstCard.off('click', flipCard).addClass('matched');
    secondCard.off('click', flipCard).addClass('matched');
    matchedPairs++;
    consecutiveMatches++;
    checkPowerUp();
    resetBoard();
    updateStatus();
    checkWin(); 
}

function unflipCards() {
    consecutiveMatches = 0; 
    setTimeout(() => {
        firstCard.toggleClass('flip') 
        secondCard.toggleClass('flip')
        resetBoard();
    }, 1000);
}

function resetBoard() {
    [firstCard, secondCard, lockBoard] = [null, null, false];
}

function updateStatus() {
    $('#clicks').text(clicks);
    $('#pairs-matched').text(matchedPairs); 
    $('#pairs-left').text(totalPairs - matchedPairs); 
    $('#total-pairs').text(totalPairs); 
}

function startTimer() {
    clearInterval(timerInterval);
    timeElapsed = 0;
    const initialTimeLimit = difficultySettings[currentDifficulty].time;
    $('#initial-time-display').text(initialTimeLimit);

    timerInterval = setInterval(() => {
        timeLeft--;
        timeElapsed++;
        $('#timer-display').text(timeElapsed); 

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            displayMessage("Game Over!"); 
            disableAllCards(); 
        }
    }, 1000);
}

function displayMessage(message) {
    $('#game-message').text(message);
    $('#message-overlay').removeClass('hidden');
}

function hideMessage() {
    $('#message-overlay').addClass('hidden');
}

function disableAllCards() {
    $('.card').off('click', flipCard);
}

function checkWin() {
    if (matchedPairs === totalPairs) {
        clearInterval(timerInterval);
        displayMessage("You Win!"); 
        disableAllCards(); 
    }
}

function resetGame() {
    clearInterval(timerInterval);
    hideMessage();
    matchedPairs = 0;
    clicks = 0;
    firstCard = null;
    secondCard = null;
    lockBoard = false;
    gameStarted = false;
    consecutiveMatches = 0;
    powerUpActive = false;
    timeElapsed = 0;
    updateStatus();
    $('#timer-display').text('0');
    $('#initial-time-display').text('0');
    $('#game_grid').empty();
    $('.game-info').addClass('hidden'); 
    $('#start-button').prop('disabled', false); 
}

async function startGame() {
    if (gameStarted) return; 
    gameStarted = true;

    const settings = difficultySettings[currentDifficulty];

    $('#game_grid').removeClass('easy medium hard').addClass(settings.grid);

    resetGame(); 

    const images = await fetchPokemonImages(settings.cards);
    createCards(images);
    timeLeft = settings.time; 
    $('.game-info').removeClass('hidden');
    startTimer(); 
    $('#start-button').prop('disabled', true);
}


function activatePowerUp() {
    powerUpActive = true;
    
    timeLeft += 10;
   displayMessage("Power Up Activated! +10 Seconds!");
    
    setTimeout(() => {
        powerUpActive = false;
    }, 1000);


    
    setTimeout(() => {
        $('.card:not(.matched)').each(function() {
            if (!$(this).data('was-flipped')) {
                $(this).removeClass('flip');
            }
            $(this).removeData('was-flipped');
        });
        hideMessage();
        powerUpActive = false;
    }, 2000); 
}

function checkPowerUp() {
    if (consecutiveMatches >= 2 && !powerUpActive) {
        activatePowerUp();
        consecutiveMatches = 0; 
    }
}

function toggleTheme() {
    $('body').toggleClass('dark-theme');
} 

$(document).ready(function() {
      $('.difficulty-button').on('click', function() {
        $('.difficulty-button').removeClass('active'); 
        $(this).addClass('active'); 
        currentDifficulty = $(this).data('difficulty');
        resetGame(); 
    });

    $('#start-button').on('click', startGame); 
    $('#reset-button').on('click', resetGame); 
    $('#theme-toggle').on('click', toggleTheme); 


    updateStatus();
    $('.game-info').addClass('hidden');
});