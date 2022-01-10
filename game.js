/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\
|                                                                  |
|     ______           _   ___                   _          _      |
|     | ___ \         | | |_  |                 | |        | |     |
|     | |_/ /___ _ __ | |   | | _____      _____| | ___  __| |     |
|     |    // _ \ '_ \| |   | |/ _ \ \ /\ / / _ \ |/ _ \/ _` |     |
|     | |\ \  __/ |_) | /\__/ /  __/\ V  V /  __/ |  __/ (_| |     |
|     \_| \_\___| .__/|_\____/ \___| \_/\_/ \___|_|\___|\__,_|     |
|             | |                                                  |
|             |_|                                                  |
|                                                                  |
|      A Replit themed Bejeweled clone. Made with KaBoom.js.       |
|                                                                  |
\~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

// TODO: 
// - [ ] Check for no possible moves (game over)
// - [ ] Juice it up a bit (can we do particles?)
// - [ ] Title screen

init({
  width: 700,
  height: 512,
});

// How close the gems need to be to their desired position, before we snap them.
const EPSILON = 10.0;

// Make sure there is an image for each gem kind in the "res" directory
const gems = [
  "replangry",
  "bot",
  "prompt",
  "replit",
  "repljoy",
  "replhappy",
];

// Scoring is (gem score * count)
const gemScore = (name) => {
  switch (name) {
    case "replangry":
      return 1;
    case "bot":
      return 2;
    case "prompt":
      return 4;
    case "replit":
      return 8;
    case "repljoy":
      return 16;
    case "replhappy":
      return 32;
  }
}

for (const gem of gems) {
  loadSprite(gem, `res/${gem}.png`);
}

loadSprite("selector", "res/selector.png");

const randomGem = () => {
  return gems[Math.floor(rand(0, gems.length))];
};

// Checks if 2 positions are right next to each other.
const isAdjacent = (a, b) => {
  return (Math.abs(a.x - b.x) == 1 && Math.abs(a.y - b.y) == 0) ^ (Math.abs(a.y - b.y) == 1 && Math.abs(a.x - b.x) == 0);
}

// Used to get all the adjcent positions for a position
const dirs = [
  vec2( 1,  0),
  vec2(-1,  0),
  vec2( 0,  1),
  vec2( 0, -1),
];

scene("main", () => {
  const boardWidth = 10, boardHeight = 10;
  const gemSize = 40;
  const boardCenter = vec2(100 + (-boardWidth * gemSize / 2), -boardHeight * gemSize / 2);

  let interactive = true;

  let swappers = [];

  const boardPosToRealPos = (p) => {
    return vec2(boardCenter.x + p.x * gemSize, boardCenter.y + p.y * gemSize);
  }
  
  const setupBoard = () => {
    let board = [];

    for (let y = 0; y < boardHeight; y++) {
      let row = [];
      for (let x = 0; x < boardWidth; x++) {
        // Ensure that we don't end up with any 3 in a row to start with
        let left = (x < 2) ? null : row[x - 1];
        let top = (y < 2) ? null : board[y - 1][x];

        let leftleft = (x < 2) ? null : row[x - 2];
        let toptop = (y < 2) ? null : board[y - 2][x];

        let gem = randomGem();
        while ((top && toptop && gem == top.kind && gem === toptop.kind) || (left && leftleft && gem === left.kind && gem === leftleft.kind)) {
          gem = randomGem();
        }

        row.push(sprite(gem, {
          kind: gem,
          scale: gemSize/100,
          tags: [ "gem", ],
          boardPos: vec2(x, y),
          pos: boardPosToRealPos(vec2(x, y)),
        }));
      }
      board.push(row);
    }
    return board;
  };

  const scoreGroup = (g) => {
    console.log(g[0].kind, gemScore(g[0].kind), g.length);
    const s = gemScore(g[0].kind) * g.length;
    score.value += s;
    let pos = vec2(0, 0);
    for (const gem of g) {
      pos.x += gem.pos.x;
      pos.y += gem.pos.y;
    }
    pos.x /= g.length;
    pos.y /= g.length;
    addCoolScore(s, pos);
  };

  const addCoolScore = (score, pos) => {
    text(score, {
      size: 32,
      val: 0,
      pos,
      start: pos,
      end: vec2(pos.x, pos.y + 100),
      tags: [ "coolscore" ],
    });
  };

  action("coolscore", (s) => {
    s.val += dt();
    if (s.val >= 1.0) {
      destroy(s);
      return;
    }
    // It'd be nice if lerp worked on vec2
    // Also not sure if lerp works in general?
    // s.pos.x = lerp(s.start.x, s.end.x, s.val);
    // s.pos.y = lerp(s.start.y, s.end.y, s.val);
    s.pos.x = s.start.x + (s.end.x - s.start.x) * s.val;
    s.pos.y = s.start.y + (s.end.y - s.start.y) * s.val;
    s.color = rand(color(0.5, 0.5, 0.5, 1), color(1, 1, 1, 1));
  });

  // Looks for all 3-in a rows and then marks 
  const checkBoard = () => {
    // Gems marked for DESTRUCTION
    let marked = new Set();

    // TODO: Clean dis up

    // Check da rows
    for (let y = 0; y < boardHeight; y++) {
      let group = [];
      for (let x = 0; x < boardWidth; x++) {
        let curr = board[y][x];
        
        if (group.length === 0) {
          group.push(curr);
          continue;
        }
        if (group[0].kind === curr.kind) {
          group.push(curr);
        } else {
          if (group.length >= 3) {
            scoreGroup(group);
            for (const g of group) {
              marked.add(g);
            }
          }
          group = [curr];
        }
      }
      if (group.length >= 3) {
        scoreGroup(group);
        for (const g of group) {
          marked.add(g);
        }
      }
    }

    // Check da cols
    for (let x = 0; x < boardWidth; x++) {
      let group = [];
      for (let y = 0; y < boardHeight; y++) {
        let curr = board[y][x];
        
        if (group.length === 0) {
          group.push(curr);
          continue;
        }
        if (group[0].kind === curr.kind) {
          group.push(curr);
        } else {
          if (group.length >= 3) {
            scoreGroup(group);
            for (const g of group) {
              marked.add(g);
            }
          }
          group = [curr];
        }
      }
      if (group.length >= 3) {
        scoreGroup(group);
        for (const g of group) {
          marked.add(g);
        }
      }
    }

    for (const gem of marked) {
      board[gem.boardPos.y][gem.boardPos.x] = null;
      destroy(gem);
    }

    return marked.size > 0;
  };

  // Refill the board on a column basis
  const refillBoard = () => {
    for (let x = 0; x < boardWidth; x++) {
      let col = [];
      for (let y = 0; y < boardHeight; y++) {
        let curr = board[y][x];
        if (curr) {
          col.push(curr);
        }
      }

      const emptyCount = boardHeight - col.length;

      while (col.length < boardHeight) {
        const gem = randomGem();

        col.push(sprite(gem, {
          kind: gem,
          scale: gemSize/100,
          tags: [ "gem", ],
          pos: boardPosToRealPos(vec2(x, col.length + emptyCount)),
        }));
      }

      for (let y = 0; y < boardHeight; y++) {
        board[y][x] = col[y];
        board[y][x].boardPos = vec2(x, y);
      }
    }
  };

  let board = setupBoard();

  text("ColorCrush by Daksh", {
    size: 32,
    pos: vec2(0, height() / 2 - 30),
  });

  let score = text("Score: 0", {
    size: 16,
    value: 0,
    pos: vec2(-width() / 2 + 100, 150),
    tags: [ "score" ],
  });

  // Add score legend
  for (const [i, gem] of gems.entries()) {
    const y = i * (350 / gems.length) + boardCenter.y;
    sprite(gem, {
      kind: gem,
      scale: 0.5,
      pos: vec2(-width() / 2 + 70, y),
    });
    text(gemScore(gem), {
      size: 28,
      pos: vec2(-width() / 2 + 130, y),
    })
  }

  action("score", (s) => {
    s.text = `Score: ${s.value}`;
  });

  // Moves the real pos of the gems to their real pos
  action("gem", (g) => {
    const desired = boardPosToRealPos(g.boardPos);
    if (Math.abs(g.pos.x - desired.x) > EPSILON || Math.abs(g.pos.y - desired.y) > EPSILON) {
      // The min, makes sure we don't accidentally jump too far with a high dt.
      // Seems like we could do something better than this.
      const by = Math.min(dt() * 10000.0, 167);
      const dir = vec2(desired.x - g.pos.x, desired.y - g.pos.y).unit();
      g.move(vec2(by * dir.x, by * dir.y));
    } else {
      g.pos = desired;
    }
  });

  // Swap selection
  const swap = (a, b) => {
    const temp = a.boardPos;
    a.boardPos = b.boardPos;
    b.boardPos = temp;
    board[a.boardPos.y][a.boardPos.x] = a;
    board[b.boardPos.y][b.boardPos.x] = b;
  };

  click("gem", async (g) => {
    if (!interactive) {
      return;
    }

    let i = swappers.indexOf(g);
    if (i !== -1) {
      swappers.splice(i, 1);
    } else if (swappers.length < 2) {
      if (swappers.length > 0 && !isAdjacent(swappers[0].boardPos, g.boardPos)) {
        return;
      }
      swappers.push(g);
    }

    destroyAll("selector");

    if (swappers.length == 2) {
      interactive = false;
      swap(swappers[0], swappers[1]);
      await wait(0.5);
      if (checkBoard()) {
        refillBoard();
        await wait(1.0);
        // Check again after refill.
        while (checkBoard()) {
          refillBoard();
          await wait(1.0);
        }
      } else {
        // There must be some new matches, otherwise the move was invalid!
        swap(swappers[1], swappers[0]);
      }
      swappers = [];
      interactive = true;
    }

    for (const swapper of swappers) {
      sprite("selector", {
        scale: (gemSize + 10)/100,
        pos: swapper.pos,
        tags: [ "selector" ]
      })
    }
  });
});

start("main");