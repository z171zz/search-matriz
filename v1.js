require('colors');
const readline = require('readline');
const fs = require('fs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function luhnCheck(partialNumber) {
  let sum = 0;
  let shouldDouble = false;
  const sanitized = partialNumber.replace(/\D/g, '');
  for (let i = sanitized.length - 1; i >= 0; i--) {
    let digit = parseInt(sanitized.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

function calculateCheckDigit(partialNumber) {
  let sum = 0;
  let shouldDouble = true;
  const sanitized = partialNumber.replace(/\D/g, '');
  for (let i = sanitized.length - 1; i >= 0; i--) {
    let digit = parseInt(sanitized.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return (10 - (sum % 10)) % 10;
}

function generateExpirationDate() {
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0'); 
  const year = String(Math.floor(Math.random() * 6) + 2026).slice(-2);
  return `${month}/${year}`;
}

function generateValidCards(bin, count = 5, partialLength = 12) {
  const validCards = [];
  const binLength = bin.length;

  if (binLength >= partialLength) {
    console.log('[!]'.red + ' Erro: BIN muito longa para o tamanho da matriz.'.red);
    return [];
  }

  for (let i = 0; i < count; i++) {
    let partialNumber = bin;
    for (let j = binLength; j < partialLength - 1; j++) {
      partialNumber += Math.floor(Math.random() * 10);
    }
    const checkDigit = calculateCheckDigit(partialNumber);
    const fullPartialNumber = partialNumber + checkDigit;
    if (luhnCheck(fullPartialNumber)) {
      const expirationDate = generateExpirationDate();
      const displayNumber = fullPartialNumber + 'xxxx';
      validCards.push({ card: displayNumber, expiration: expirationDate });
    } else {
      i--; 
    }
  }
  return validCards;
}

function saveToFile(cards) {
  const content = cards.map(({ card, expiration }) => `${card}|${expiration}`).join('\n');
  fs.writeFileSync('lives.txt', content + '\n', 'utf8');
  //console.log('[#]'.cyan + ' Matrizes salvas em lives.txt!'.cyan.bold);
}

function showLoading() {
  return new Promise(resolve => {
    const frames = ['.', '..', '...', '....'];
    let i = 0;
    console.log('[#]'.cyan + ' Iniciando busca da matriz...'.cyan);
    const interval = setInterval(() => {
      process.stdout.write('\r[@]'.green + ` Procurando matrizes${frames[i % frames.length]}`.green);
      i++;
    }, 200);
    setTimeout(() => {
      clearInterval(interval);
      process.stdout.write('\r');
      resolve();
    }, 1500);
  });
}

function main() {
  process.title = "by lofygang";
  console.clear();
  console.log('[?]'.yellow + ' Bem-vindo ao Search Matriz!'.yellow.bold);
  rl.question('[#]'.cyan + ' Qual matriz deseja buscar? '.cyan, async (bin) => {
    if (!/^\d{6,}$/.test(bin)) {
      console.log('[!]'.red + ' Erro: BIN deve conter apenas números e ter pelo menos 6 dígitos.'.red);
      rl.close();
      return;
    }

    await showLoading();

    const validCards = generateValidCards(bin, 5);
    if (validCards.length === 0) {
      console.log('[!]'.red + ' Não foi possível buscar matrizes válidas.'.red);
    } else {
      console.log('[#]'.cyan + ` Matrizes válidas encontrada para o BIN ${bin}:\n`.cyan.bold);
      validCards.forEach(({ card, expiration }, index) => {
        const formattedCard = card.slice(0, 12) + card.slice(12);
        console.log(`[@]`.green + ` Matriz ${index + 1}: ${formattedCard} | ${expiration} - Válido: ${luhnCheck(card.slice(0, 12))}`.green);
      });
      saveToFile(validCards);
    }

    rl.question('\n[?]'.yellow + ' Busca concluída! Deseja buscar outra matriz? (s/n): '.yellow, (answer) => {
        if (answer.toLowerCase() === 's') {
          main();
        } else {
          console.log('\n[!]'.red + ' Saindo...'.red.bold);
          rl.close();
        }
      });
   });
 }

main();