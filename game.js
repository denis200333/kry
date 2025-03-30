// Debug logging
console.log('Inicjalizacja gry w kry v0.02...');

// Wersja gry
const GAME_VERSION = '0.02';

// Pobieranie elementów
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const turnElement = document.getElementById('turn');
const bouncesElement = document.getElementById('bounces');
const statusElement = document.getElementById('status');

// Ustawienia canvas i siatki
canvas.width = 600;
canvas.height = 400;
const GRID_SIZE = 40;
const GRID_COLS = Math.floor(canvas.width / GRID_SIZE);
const GRID_ROWS = Math.floor(canvas.height / GRID_SIZE);

// Stan gry
const gameState = {
    currentPlayer: 1, // 1 lub 2
    bounces: 0,
    score: {
        player1: 0,
        player2: 0
    },
    moves: [], // historia ruchów
    currentPosition: {
        x: Math.floor(GRID_COLS / 2),
        y: Math.floor(GRID_ROWS / 2)
    },
    selectedDirection: null,
    possibleMoves: [],
    lastBounceType: null // 'border' lub 'point'
};

// Bramki
const goals = {
    player1: { x: 0, y: Math.floor(GRID_ROWS / 2) },
    player2: { x: GRID_COLS - 1, y: Math.floor(GRID_ROWS / 2) }
};

// Kierunki ruchu
const directions = [
    { dx: -1, dy: -1 }, // lewo-góra
    { dx: 0, dy: -1 },  // góra
    { dx: 1, dy: -1 },  // prawo-góra
    { dx: -1, dy: 0 },  // lewo
    { dx: 1, dy: 0 },   // prawo
    { dx: -1, dy: 1 },  // lewo-dół
    { dx: 0, dy: 1 },   // dół
    { dx: 1, dy: 1 }    // prawo-dół
];

// Obsługa klawiszy
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    Space: false,
    KeyR: false
};

document.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.code)) {
        keys[e.code] = true;
        handleInput();
    }
});

document.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.code)) {
        keys[e.code] = false;
    }
});

// Dodajemy obsługę myszy
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = Math.floor((e.clientX - rect.left) / GRID_SIZE);
    const mouseY = Math.floor((e.clientY - rect.top) / GRID_SIZE);
    
    // Znajdź kierunek najbliższy do pozycji myszy
    const dx = mouseX - gameState.currentPosition.x;
    const dy = mouseY - gameState.currentPosition.y;
    
    // Sprawdź czy to sąsiednia kratka
    if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
        // Znajdź odpowiedni indeks w tablicy directions
        const dirIndex = directions.findIndex(dir => 
            dir.dx === Math.sign(dx) && dir.dy === Math.sign(dy)
        );
        if (dirIndex !== -1 && gameState.possibleMoves.includes(directions[dirIndex])) {
            gameState.selectedDirection = dirIndex;
        }
    }
});

canvas.addEventListener('click', () => {
    if (gameState.selectedDirection !== null) {
        makeMove(directions[gameState.selectedDirection]);
        gameState.selectedDirection = null;
    }
});

// Funkcja sprawdzająca możliwe ruchy
function getPossibleMoves(pos) {
    return directions.filter(dir => {
        const newX = pos.x + dir.dx;
        const newY = pos.y + dir.dy;
        
        // Sprawdź czy ruch jest w granicach planszy
        if (newX < 0 || newX >= GRID_COLS || newY < 0 || newY >= GRID_ROWS) {
            return false;
        }
        
        // Sprawdź czy linia nie została już narysowana (w obu kierunkach)
        const lineExists = gameState.moves.some(move => 
            (move.from.x === pos.x && move.from.y === pos.y && 
             move.to.x === newX && move.to.y === newY) ||
            (move.from.x === newX && move.from.y === newY && 
             move.to.x === pos.x && move.to.y === pos.y)
        );
        
        return !lineExists;
    });
}

// Funkcja sprawdzająca odbicia
function checkBounce(pos, dir) {
    const newX = pos.x + dir.dx;
    const newY = pos.y + dir.dy;
    
    // Sprawdź odbicie od ściany (bandy)
    if (newX < 0 || newX >= GRID_COLS || newY < 0 || newY >= GRID_ROWS) {
        // Jeśli to nie jest bramka, to jest odbicie
        if (!((newX === goals.player1.x && newY === goals.player1.y) ||
              (newX === goals.player2.x && newY === goals.player2.y))) {
            // Sprawdź czy poprzednie odbicie nie było od krawędzi
            if (gameState.lastBounceType !== 'border') {
                console.log('Odbicie od bandy!');
                gameState.lastBounceType = 'border';
                return true;
            } else {
                console.log('Nie można wykonać kolejnego odbicia od bandy!');
                return false;
            }
        }
    }

    // Sprawdź czy w nowym punkcie jest już jakiś ruch (punkt końcowy lub początkowy)
    // lub czy jest to punkt na krawędzi planszy
    const isBorderPoint = newX === 0 || newX === GRID_COLS - 1 || newY === 0 || newY === GRID_ROWS - 1;
    const hasPointInNewPosition = gameState.moves.some(move => {
        return (move.from.x === newX && move.from.y === newY) || 
               (move.to.x === newX && move.to.y === newY);
    });

    if (hasPointInNewPosition || isBorderPoint) {
        // Jeśli to punkt na krawędzi, sprawdź czy poprzednie odbicie nie było od krawędzi
        if (isBorderPoint && gameState.lastBounceType === 'border') {
            console.log('Nie można wykonać kolejnego odbicia od krawędzi!');
            return false;
        }
        
        console.log('Odbicie od punktu!');
        gameState.lastBounceType = isBorderPoint ? 'border' : 'point';
        return true;
    }

    return false;
}

// Funkcja wykonująca ruch
function makeMove(direction) {
    const newX = gameState.currentPosition.x + direction.dx;
    const newY = gameState.currentPosition.y + direction.dy;
    
    // Sprawdź czy jest gol
    if ((newX === goals.player1.x && newY === goals.player1.y) ||
        (newX === goals.player2.x && newY === goals.player2.y)) {
        // Zapisz ostatni ruch przed golem
        gameState.moves.push({
            from: {...gameState.currentPosition},
            to: {x: newX, y: newY},
            player: gameState.currentPlayer
        });
        
        // Gol!
        if (newX === goals.player1.x) {
            gameState.score.player2++;
        } else {
            gameState.score.player1++;
        }
        resetGame(false);
        return;
    }
    
    // Sprawdź odbicie przed zapisaniem ruchu
    const willBounce = checkBounce({...gameState.currentPosition}, direction);
    
    // Zapisz ruch
    gameState.moves.push({
        from: {...gameState.currentPosition},
        to: {x: newX, y: newY},
        player: gameState.currentPlayer
    });
    
    // Aktualizuj pozycję
    gameState.currentPosition = {x: newX, y: newY};
    
    // Obsłuż odbicie
    if (willBounce) {
        gameState.bounces++;
        bouncesElement.textContent = gameState.bounces;
        statusElement.textContent = 'Odbicie! Możesz wykonać dodatkowy ruch';
        
        // Aktualizuj możliwe ruchy po odbiciu
        gameState.possibleMoves = getPossibleMoves(gameState.currentPosition);
        
        // Jeśli nie ma możliwych ruchów po odbiciu, to gol dla przeciwnika
        if (gameState.possibleMoves.length === 0) {
            console.log('Brak możliwych ruchów - gol!');
            if (gameState.currentPlayer === 1) {
                gameState.score.player2++;
            } else {
                gameState.score.player1++;
            }
            resetGame(false);
            return;
        }
    } else {
        // Zmień turę
        gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
        gameState.bounces = 0;
        bouncesElement.textContent = gameState.bounces;
        turnElement.textContent = `Gracz ${gameState.currentPlayer}`;
        statusElement.textContent = 'Ruch gracza';
    }
    
    // Aktualizuj możliwe ruchy
    gameState.possibleMoves = getPossibleMoves(gameState.currentPosition);
    
    // Aktualizuj wynik
    scoreElement.textContent = `Wynik: ${gameState.score.player1} - ${gameState.score.player2}`;
}

// Funkcja obsługująca input
function handleInput() {
    if (keys.KeyR) {
        resetGame(true);
        return;
    }
    
    if (keys.Space && gameState.selectedDirection !== null) {
        makeMove(directions[gameState.selectedDirection]);
        gameState.selectedDirection = null;
        return;
    }
    
    // Wybór kierunku
    if (keys.ArrowUp && keys.ArrowLeft) gameState.selectedDirection = 0;
    else if (keys.ArrowUp && !keys.ArrowLeft && !keys.ArrowRight) gameState.selectedDirection = 1;
    else if (keys.ArrowUp && keys.ArrowRight) gameState.selectedDirection = 2;
    else if (keys.ArrowLeft && !keys.ArrowUp && !keys.ArrowDown) gameState.selectedDirection = 3;
    else if (keys.ArrowRight && !keys.ArrowUp && !keys.ArrowDown) gameState.selectedDirection = 4;
    else if (keys.ArrowDown && keys.ArrowLeft) gameState.selectedDirection = 5;
    else if (keys.ArrowDown && !keys.ArrowLeft && !keys.ArrowRight) gameState.selectedDirection = 6;
    else if (keys.ArrowDown && keys.ArrowRight) gameState.selectedDirection = 7;
}

// Funkcja rysująca siatkę
function drawGrid() {
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    
    // Pionowe linie
    for (let x = 0; x <= canvas.width; x += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // Poziome linie
    for (let y = 0; y <= canvas.height; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

// Funkcja rysująca bramki
function drawGoals() {
    // Bramka gracza 1 (niebieska)
    ctx.fillStyle = '#0000ff';
    ctx.fillRect(
        goals.player1.x * GRID_SIZE,
        goals.player1.y * GRID_SIZE,
        GRID_SIZE,
        GRID_SIZE
    );
    
    // Tekst "GRACZ 1" nad bramką
    ctx.fillStyle = 'white';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GRACZ 1 (①)', 
        goals.player1.x * GRID_SIZE + GRID_SIZE/2,
        goals.player1.y * GRID_SIZE - 5
    );

    // Bramka gracza 2 (czerwona)
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(
        goals.player2.x * GRID_SIZE,
        goals.player2.y * GRID_SIZE,
        GRID_SIZE,
        GRID_SIZE
    );
    
    // Tekst "GRACZ 2" nad bramką
    ctx.fillStyle = 'white';
    ctx.fillText('GRACZ 2 (②)', 
        goals.player2.x * GRID_SIZE + GRID_SIZE/2,
        goals.player2.y * GRID_SIZE - 5
    );

    // Strzałki wskazujące kierunek ataku
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    
    // Strzałka dla gracza 1 (→)
    ctx.fillText('→', 
        goals.player1.x * GRID_SIZE + GRID_SIZE * 1.5,
        goals.player1.y * GRID_SIZE + GRID_SIZE/1.5
    );
    
    // Strzałka dla gracza 2 (←)
    ctx.fillText('←', 
        goals.player2.x * GRID_SIZE - GRID_SIZE/2,
        goals.player2.y * GRID_SIZE + GRID_SIZE/1.5
    );

    // Dodaj wersję gry w rogu
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`v${GAME_VERSION}`, canvas.width - 10, canvas.height - 10);
}

// Funkcja rysująca ruchy
function drawMoves() {
    gameState.moves.forEach(move => {
        ctx.beginPath();
        ctx.moveTo(
            move.from.x * GRID_SIZE + GRID_SIZE/2,
            move.from.y * GRID_SIZE + GRID_SIZE/2
        );
        ctx.lineTo(
            move.to.x * GRID_SIZE + GRID_SIZE/2,
            move.to.y * GRID_SIZE + GRID_SIZE/2
        );
        ctx.strokeStyle = move.player === 1 ? '#0000ff' : '#ff0000';
        ctx.lineWidth = 2;
        ctx.stroke();
    });
}

// Funkcja rysująca aktualną pozycję
function drawCurrentPosition() {
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(
        gameState.currentPosition.x * GRID_SIZE + GRID_SIZE/2,
        gameState.currentPosition.y * GRID_SIZE + GRID_SIZE/2,
        5,
        0,
        Math.PI * 2
    );
    ctx.fill();
}

// Funkcja rysująca możliwe ruchy
function drawPossibleMoves() {
    // Najpierw rysujemy wszystkie możliwe ruchy
    gameState.possibleMoves.forEach((move, index) => {
        const newX = gameState.currentPosition.x + move.dx;
        const newY = gameState.currentPosition.y + move.dy;
        
        // Rysuj linię pomocniczą
        ctx.beginPath();
        ctx.moveTo(
            gameState.currentPosition.x * GRID_SIZE + GRID_SIZE/2,
            gameState.currentPosition.y * GRID_SIZE + GRID_SIZE/2
        );
        ctx.lineTo(
            newX * GRID_SIZE + GRID_SIZE/2,
            newY * GRID_SIZE + GRID_SIZE/2
        );
        ctx.strokeStyle = index === gameState.selectedDirection ? '#00ff00' : 'rgba(102, 102, 102, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Rysuj punkt końcowy
        ctx.beginPath();
        ctx.arc(
            newX * GRID_SIZE + GRID_SIZE/2,
            newY * GRID_SIZE + GRID_SIZE/2,
            3,
            0,
            Math.PI * 2
        );
        ctx.fillStyle = index === gameState.selectedDirection ? '#00ff00' : '#666';
        ctx.fill();
    });
    
    // Jeśli jest wybrany kierunek, rysujemy go wyraźniej
    if (gameState.selectedDirection !== null) {
        const move = directions[gameState.selectedDirection];
        const newX = gameState.currentPosition.x + move.dx;
        const newY = gameState.currentPosition.y + move.dy;
        
        ctx.beginPath();
        ctx.moveTo(
            gameState.currentPosition.x * GRID_SIZE + GRID_SIZE/2,
            gameState.currentPosition.y * GRID_SIZE + GRID_SIZE/2
        );
        ctx.lineTo(
            newX * GRID_SIZE + GRID_SIZE/2,
            newY * GRID_SIZE + GRID_SIZE/2
        );
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

// Funkcja resetująca grę
function resetGame(fullReset = true) {
    gameState.currentPosition = {
        x: Math.floor(GRID_COLS / 2),
        y: Math.floor(GRID_ROWS / 2)
    };
    gameState.moves = [];
    gameState.bounces = 0;
    gameState.selectedDirection = null;
    gameState.lastBounceType = null; // Reset typu ostatniego odbicia
    gameState.possibleMoves = getPossibleMoves(gameState.currentPosition);
    
    if (fullReset) {
        gameState.score.player1 = 0;
        gameState.score.player2 = 0;
        gameState.currentPlayer = 1;
    }
    
    bouncesElement.textContent = gameState.bounces;
    turnElement.textContent = `Gracz ${gameState.currentPlayer}`;
    scoreElement.textContent = `Wynik: ${gameState.score.player1} - ${gameState.score.player2}`;
    statusElement.textContent = 'Nowa gra';
}

// Funkcja resetująca piłkę
function resetBall() {
    gameState.currentPosition = {
        x: Math.floor(GRID_COLS / 2),
        y: Math.floor(GRID_ROWS / 2)
    };
    gameState.possibleMoves = getPossibleMoves(gameState.currentPosition);
}

// Główna pętla gry
function gameLoop() {
    // Czyszczenie canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Rysowanie elementów
    drawGrid();
    drawGoals();
    drawMoves();
    drawCurrentPosition();
    drawPossibleMoves();
    
    // Kontynuacja pętli
    requestAnimationFrame(gameLoop);
}

// Aktualizacja informacji o sterowaniu
document.getElementById('controls').innerHTML = `
    <p>Sterowanie:</p>
    <p>← ↑ → ↓ - wybór kierunku ruchu</p>
    <p>SPACJA - wykonaj ruch</p>
    <p>MYSZKA - wskaż i kliknij aby wykonać ruch</p>
    <p>R - reset gry</p>
`;

// Inicjalizacja gry
resetGame();
gameLoop();

console.log('Gra w kry została uruchomiona!'); 