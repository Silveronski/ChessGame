let gameHasStarted = false;
var board = null;
let socket = io();
var game = new Chess();
var $status = $('#status');
var $statusMob = $('#statusMob');
var $evaluation = $('.evaluation');
var $evaluationMob = $('.evaluationMob');
var $pgn = $('#pgn-container');
var $pgnMobile = $('#pgn-mobile');
var $bruhSound = $('#bruhSound');
var $checkSound = $('#checkSound'); 
var $checkMateSound = $('#checkMateSound'); 
var $drawSound = $('#drawSound');
var $rizzSound = $('#rizzSound');
var $fartSound = $('#fartSound');
var $rematchBtn = $('#rematchBtn');
var $rematchBtnMob = $('#rematchBtnMob');
let gameOver = false;
let moveCount = 1;
let turnCount = 0;
let colorWhoResigned = '';
let colorWhoRequestedDraw = '';
let colorWhoRequestedRematch = '';

$('#resignBtn').on('click', handleResign);
$('#resignBtnMob').on('click', handleResign);
    
$('#drawBtn').on('click', handleDraw); 
$('#drawBtnMob').on('click', handleDraw);

$rematchBtn.on('click', handleRematch);
$rematchBtnMob.on('click', handleRematch);

function onDragStart (source, piece, position, orientation) {
    // do not pick up pieces if the game is over
    if (game.game_over()) return false;
    if (!gameHasStarted) return false;
    if (gameOver) return false;

    if ((playerColor === 'black' && piece.search(/^w/) !== -1) || (playerColor === 'white' && piece.search(/^b/) !== -1)) {
        return false;
    }

    // only pick up pieces for the side to move
    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) || (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false;
    }
}

// this gets called when you make a move
function onDrop (source, target) {
    let theMove = {
        from: source,
        to: target,
        promotion: 'q' // NOTE: always promote to a queen for simplicity
    };

    // see if the move is legal
    var move = game.move(theMove);

    // illegal move
    if (move === null) return 'snapback';

    socket.emit('move', theMove);
    updateStatus();       
    updateEvaluation(); 
}

function countCapturedPieces() {
    const piecesOnTheBoard = {
        white: { p: 0, n: 0, b: 0, r: 0, q: 0 },
        black: { p: 0, n: 0, b: 0, r: 0, q: 0 }
    };

    let whiteSumOfPieces = 0;
    let blackSumOfPieces = 0;

    const board = game.board();
    board.flat().forEach(piece => {
        if (piece !== null) {
            const color = piece.color === 'w' ? 'white' : 'black';
            const type = piece.type;

            if (type === 'p') {
                piecesOnTheBoard[color][type]++;
                color === 'white' ? whiteSumOfPieces++ : blackSumOfPieces++;
            }
            else if (type === 'n' || type === 'b') {
                piecesOnTheBoard[color][type] += 3;
                color === 'white' ? whiteSumOfPieces += 3 : blackSumOfPieces += 3;
            }
            else if (type === 'r') {
                piecesOnTheBoard[color][type] += 5;
                color === 'white' ? whiteSumOfPieces += 5 : blackSumOfPieces += 5;
            }
            else if (type === 'q') {
                piecesOnTheBoard[color][type] += 9;
                color === 'white' ? whiteSumOfPieces += 9 : blackSumOfPieces += 9;
            }
        }
    });

    return {whiteSumOfPieces, blackSumOfPieces};
}

function updateEvaluation() {
    const {whiteSumOfPieces, blackSumOfPieces} = countCapturedPieces(); 
    if (whiteSumOfPieces > blackSumOfPieces) {
        const difference = whiteSumOfPieces - blackSumOfPieces;
        $evaluation.html(`White is leading by ${difference} material ${difference > 1 ? 'points' : 'point'}`);
        $evaluation.css('color', '#f8dcb4');

        $evaluationMob.html(`White is leading by ${difference} material ${difference > 1 ? 'points' : 'point'}`);
        $evaluationMob.css('color', '#f8dcb4');
    }
    else if (blackSumOfPieces > whiteSumOfPieces) {
        const difference = blackSumOfPieces - whiteSumOfPieces;
        $evaluation.html(`Black is leading by ${difference} material ${difference > 1 ? 'points' : 'point'}`);
        $evaluation.css('color', '#b88c64');

        $evaluationMob.html(`Black is leading by ${difference} material ${difference > 1 ? 'points' : 'point'}`);
        $evaluationMob.css('color', '#b88c64');
    }
    else{
        $evaluation.html(`Equal Material`);
        $evaluation.css('color', 'white');

        $evaluationMob.html(`Equal Material`);
        $evaluationMob.css('color', 'white');
    }
}

// this gets called when the oponent makes a move
socket.on('newMove', function(move) {
    game.move(move);
    board.position(game.fen());
    countCapturedPieces();
    updateStatus();
    playGameSounds(game);
    updatePgn();
    updateEvaluation();   
});

function playGameSounds(game){
    if ((game.in_checkmate())) {
        $checkMateSound.get(0).play();
    }       
    else if(game.in_check()){
        $checkSound.get(0).play();
    }
    else if (game.in_draw()) {
        $drawSound.get(0).play();
    }
    else {
        $bruhSound.get(0).play();
    }             
}

// update the board position after the piece snap
// for castling, en passant, pawn promotion
function onSnapEnd () {
    board.position(game.fen());
}

function updateStatus () {
    var status = '';

    var moveColor = 'White';
    if (game.turn() === 'b') {
        moveColor = 'Black';
    }

    if (game.in_checkmate()) {
        status = 'Game over, ' + moveColor + ' is in checkmate.';
        $rematchBtn.css('display', 'block');
        $rematchBtnMob.css('display', 'block');
    }

    else if (game.in_draw()) {
        status = 'Game over, drawn position';
        $rematchBtn.css('display', 'block');
        $rematchBtnMob.css('display', 'block');
    }

    else if (gameOver) {
        status = 'Opponent disconnected';
    }

    else if (!gameHasStarted) {
        status = 'Waiting for black to join';
    }

    // game still on
    else {
        if (gameHasStarted) {
            status = moveColor + ' to move';
        }

        if (game.in_check()) {
            status += ', ' + moveColor + ' is in check';
        }         
    } 
    
    $status.html(status);
    $statusMob.html(status);
}


function updatePgn() {
    $pgnMobile.html(game.pgn());

    if (gameHasStarted) {                                                                
        if (game.pgn()) {                
            turnCount += 0.5;
            if (turnCount === 1) {
                turnCount = 0;
                let moveDiv = document.querySelector(`.move${moveCount}`);
                moveDiv.innerHTML =`${moveCount}. ` +  game.pgn().split('.')[moveCount];
                moveCount++;
                moveDiv.scrollIntoView({behavior: 'smooth'});
            }
            else {
                $pgn.append('<div class="move' + moveCount + '">'+ moveCount + ". " + game.pgn().split('.')[moveCount] + '</div>');  
                document.querySelector(`.move${moveCount}`).scrollIntoView({behavior: 'smooth'});                                                                                                               
            }            
        }                     
    }
}

var config = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd,
    pieceTheme: '/public/img/chesspieces/wikipedia/{piece}.png'
}

board = Chessboard('myBoard', config)
if (playerColor == 'black') {
    board.flip();
}

updateStatus();

var urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('code')) {
    socket.emit('joinGame', {
        code: urlParams.get('code')
    });
}

socket.on('startGame', function() {
    $rematchBtn.css('display', 'none');
    $rematchBtnMob.css('display', 'none');
    gameHasStarted = true;
    updateStatus();
});

socket.on('gameOverDisconnect', function() {
    gameOver = true;
    updateStatus();
});

socket.on('drawRequest', function() {
    if (colorWhoRequestedDraw === '') {
        toastr.info(
            `Your opponent has offered a draw`, 
            "Draw request",
            {
                timeOut: 10000,
                extendedTimeOut: 0, 
                progressBar: true,
                closeButton: true, 
                positionClass: "toast-bottom-left", 
                tapToDismiss: false,
                preventDuplicates: true,
                closeHtml: `<button onclick="acceptDraw()">Accept</button>` +
                            `<br />` +
                            `<button onclick="rejectDraw()">Reject</button>`
            }
        );
    }
});

window.acceptDraw = () => {
    socket.emit('draw');       
}

window.rejectDraw = () => {
    socket.emit('drawReject');
}

socket.on('drawReject', function() {
    if (colorWhoRequestedDraw !== '') {
        colorWhoRequestedDraw = '';
        toastr.error(
            `Your opponent has declined your draw offer`, 
            "Draw offer rejected",
            {
                timeOut: 3000,
                extendedTimeOut: 0, 
                closeButton: true, 
                positionClass: "toast-bottom-left", 
                tapToDismiss: false,
                preventDuplicates: true,              
            }
        );
    }
});


socket.on('draw', function() {
    $status.html(`Draw!`);
    $statusMob.html(`Draw!`);

    $rematchBtn.css('display', 'block');
    $rematchBtnMob.css('display', 'block');

    gameOver = true;
    $drawSound.get(0).play();
});

socket.on('resign', function() {
    if (colorWhoResigned === '') {
        $status.html(`Your opponent has resigned, game over!`);
        $statusMob.html(`Your opponent has resigned, game over!`);
        $rizzSound.get(0).play();
    } 
    else {
        $status.html(`You have resigned, game over!`);
        $statusMob.html(`You have resigned, game over!`);
        $fartSound.get(0).play();
    } 
    colorWhoResigned = '';

    gameOver = true;

    $rematchBtn.css('display', 'block');
    $rematchBtnMob.css('display', 'block');
});


function handleResign() {
    if (gameHasStarted && !gameOver && !game.in_checkmate()) {
        colorWhoResigned = playerColor;
        socket.emit('resign');
    } 
}

function handleDraw() {
    if (gameHasStarted && !gameOver && !game.in_checkmate()) {
        colorWhoRequestedDraw = playerColor;
        socket.emit('drawRequest');

        toastr.success(
            `A draw offer was sent to your opponent`, 
            "Draw offer",
            {
                timeOut: 3000,
                extendedTimeOut: 0, 
                closeButton: true, 
                positionClass: "toast-bottom-left", 
                tapToDismiss: false,
                preventDuplicates: true,              
            }
        );
    }
}

function handleRematch() {
    if (gameOver) {
        colorWhoRequestedRematch = playerColor;
        socket.emit('rematchRequest');

        toastr.success(
            `A rematch offer was sent to your opponent`, 
            "Rematch offer",
            {
                timeOut: 3000,
                extendedTimeOut: 0, 
                closeButton: true, 
                positionClass: "toast-bottom-left", 
                tapToDismiss: false,
                preventDuplicates: true,              
            }
        );
    }    
}

socket.on('rematchRequest', function() {
    if (colorWhoRequestedRematch === '') {
        toastr.info(
            `Your opponent has offered a rematch`, 
            "Rematch request",
            {
                timeOut: 10000,
                extendedTimeOut: 0, 
                progressBar: true,
                closeButton: true, 
                positionClass: "toast-bottom-left", 
                tapToDismiss: false,
                preventDuplicates: true,
                closeHtml: `<button onclick="acceptRematch()">Accept</button>` +
                            `<br />` +
                            `<button onclick="rejectRemacth()">Reject</button>`
            }
        );
    }
});

window.rejectRemacth = () => {
    socket.emit('rematchReject');
}

window.acceptRematch = () => {
    socket.emit('rematch');       
}

socket.on('rematchReject', function(){
    if (colorWhoRequestedRematch !== '') {
        colorWhoRequestedRematch = '';
        toastr.error(
            `Your opponent has declined your rematch offer`, 
            "Rematch offer rejected",
            {
                timeOut: 3000,
                extendedTimeOut: 0, 
                closeButton: true, 
                positionClass: "toast-bottom-left", 
                tapToDismiss: false,
                preventDuplicates: true,              
            }
        );
    }
});

socket.on('rematch', function() {
    colorWhoRequestedRematch = '';

    moveCount = 1;
    turnCount = 0; 

    $pgn.empty(); 
    $pgnMobile.empty(); 

    $status.html(`Rematch! White to move`);
    $statusMob.html(`Rematch! White to move`);

    $rematchBtn.css('display', 'none');
    $rematchBtnMob.css('display', 'none');

    $evaluation.html(`Equal Material`);
    $evaluation.css('color', 'white');

    $evaluationMob.html(`Equal Material`);
    $evaluationMob.css('color', 'white');

    gameOver = false;
    game.reset();  
    board.position('start');     
});