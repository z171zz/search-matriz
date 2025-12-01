<?php
header('Content-Type: text/plain; charset=utf-8');
set_time_limit(null);

function debugLog($message) {
    if (isset($_GET['lofy']) || !$_GET['debug'] || $_GET['debug'] !== '1') {
        return;
    }
    file_put_contents('debug.log', date('Y-m-d H:i:s') . " - $message\n", FILE_APPEND);
}

function validateBin($bin) {
    $bin = preg_replace('/\D/', '', $bin);
    $valid = (strlen($bin) >= 6 && ctype_digit($bin)) ? $bin : false;
    return $valid;
}

function formatCardNumber($cardNumber) {
    if (preg_match('/xxxxx$/', $cardNumber)) {
        return $cardNumber;
    }
    if (strlen($cardNumber) >= 12) {
        return substr($cardNumber, 0, 12) . 'xxxx';
    }
    return $cardNumber;
}

function formatExpiration($month, $year) {
    $year = substr($year, -2);
    return sprintf("%02d/%s", $month, $year);
}

function getMatriz($bin, $filePath = 'cryptlofy.txt') {
    $results = [];
    $seen = []; // pra localiza combinações únicas de número de cartão + expiração
    
    if (!file_exists($filePath)) {
        return ['error' => 'Database de matrizes não encontrada'];
    }

    $file = new SplFileObject($filePath, 'r');
    $lineCount = 0;
    while (!$file->eof()) {
        $line = trim($file->fgets());
        if (empty($line)) continue;
        $lineCount++;
        
        $parts = explode('|', $line);
        $cardNumber = $month = $year = null;

        if (count($parts) === 2) {
            [$cardNumber, $date] = $parts;
            if (preg_match('/^(\d{2})\/(\d{2})$/', $date, $matches)) {
                $month = $matches[1];
                $year = $matches[2];
            } else {
                continue;
            }
        } elseif (count($parts) === 3 || count($parts) === 4) {
            [$cardNumber, $month, $year] = $parts;
        } else {
            continue;
        }

        // valida o numero do cartao (permitindo xxxxx), mes, e ano
        $cleanCardNumber = preg_match('/xxxxx$/', $cardNumber) ? substr($cardNumber, 0, -5) : $cardNumber;
        if (!ctype_digit($cleanCardNumber) || !ctype_digit($month) || !ctype_digit($year)) {
            continue;
        }

        // valida o mês
        if ($month < 1 || $month > 12) {
            continue;
        }

        // bloqueia anos 2024/24 e 2025/25
        $fullYear = strlen($year) == 2 ? "20$year" : $year;
        if ($fullYear == '2024' || $fullYear == '2025' || $year == '24' || $year == '25') {
            continue;
        }

        if (substr($cleanCardNumber, 0, strlen($bin)) === $bin) {
            $formattedCard = formatCardNumber($cardNumber);
            $formattedExpiration = formatExpiration($month, $year);
            $uniqueKey = "$formattedCard|$formattedExpiration";
            
            // verifica se é duplicata
            if (!isset($seen[$uniqueKey])) {
                $seen[$uniqueKey] = true;
                $results[] = "$formattedCard $formattedExpiration";
            }
        } 
    }
    $file = null;
    return $results;
}

$bin = '';
if (isset($_GET['lofy'])) {
    $bin = $_GET['lofy'];
} elseif (preg_match('/\/matriz\/(\d+)/', $_SERVER['REQUEST_URI'], $matches)) {
    $bin = $matches[1];
}

$bin = validateBin($bin);
if (!$bin) {
    http_response_code(400);
    echo "Erro: Bin Inválida. Deve conter 6 digitos.";
    exit;
}

$matriz = getMatriz($bin);

if (empty($matriz)) {
    http_response_code(404);
    echo "Erro: Matriz não encontrada: $bin";
    exit;
} elseif (isset($interesse['error'])) {
    http_response_code(500);
    echo "Erro: " . $matriz['error'];
    debugLog("Erro: " . $matriz['error']);
    exit;
} else {
    http_response_code(200);
    echo implode("\n", $matriz);
}
?>