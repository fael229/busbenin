// Configuration FedaPay
// IMPORTANT: Remplacez ces clés par vos vraies clés FedaPay
// En production, utilisez les variables d'environnement
const FEDAPAY_PUBLIC_KEY = process.env.EXPO_PUBLIC_FEDAPAY_PUBLIC_KEY || 'pk_sandbox_LnaNAMGms3R5LGOZrJg-N7m-';
const FEDAPAY_SECRET_KEY = process.env.EXPO_PUBLIC_FEDAPAY_SECRET_KEY || 'sk_sandbox_46Y0uIx1R_aGt66QOE9qJ9ku';

console.log('Loading FedaPay keys:', {
  hasPublicKey: !!FEDAPAY_PUBLIC_KEY,
  hasSecretKey: !!FEDAPAY_SECRET_KEY,
  publicKeyPrefix: FEDAPAY_PUBLIC_KEY?.substring(0, 15) || 'MISSING',
  secretKeyPrefix: FEDAPAY_SECRET_KEY?.substring(0, 15) || 'MISSING',
  fromEnv: !!process.env.EXPO_PUBLIC_FEDAPAY_SECRET_KEY,
});

// Mode sandbox pour les tests, production pour la vraie utilisation
const FEDAPAY_ENVIRONMENT = process.env.EXPO_PUBLIC_FEDAPAY_ENV || 'sandbox';

// Base URL selon l'environnement
const getBaseUrl = () => {
  return FEDAPAY_ENVIRONMENT === 'sandbox'
    ? 'https://sandbox-api.fedapay.com/v1'
    : 'https://api.fedapay.com/v1';
};

// Headers pour les requêtes API
const getHeaders = () => {
  // FedaPay utilise Bearer Authentication avec la clé secrète directement
  console.log('Auth Debug:', {
    keyLength: FEDAPAY_SECRET_KEY?.length,
    keyStart: FEDAPAY_SECRET_KEY?.substring(0, 15) + '...',
    environment: FEDAPAY_ENVIRONMENT,
  });
  
  return {
    'Authorization': `Bearer ${FEDAPAY_SECRET_KEY}`,
    'Content-Type': 'application/json',
  };
};

/**
 * Créer une transaction FedaPay
 * @param {Object} params - Paramètres de la transaction
 * @param {number} params.amount - Montant en FCFA
 * @param {string} params.description - Description de la transaction
 * @param {string} params.customerEmail - Email du client
 * @param {string} params.customerName - Nom du client
 * @param {string} params.customerPhone - Téléphone du client (format: +229XXXXXXXX)
 * @param {string} params.mobileMoneyOperator - Opérateur Mobile Money ('mtn', 'moov', 'celtiis')
 * @returns {Promise<Object>} - Transaction créée
 */
export const createTransaction = async ({
  amount,
  description,
  customerEmail,
  customerName,
  customerPhone,
  callbackUrl,
  mobileMoneyOperator,
}) => {
  try {
    // Vérifier que la clé secrète est configurée
    if (!FEDAPAY_SECRET_KEY || FEDAPAY_SECRET_KEY.length < 20) {
      throw new Error('Clé API FedaPay non configurée. Veuillez créer un fichier .env avec vos clés.');
    }

    console.log('FedaPay Config:', {
      hasKey: !!FEDAPAY_SECRET_KEY,
      keyPrefix: FEDAPAY_SECRET_KEY?.substring(0, 15) + '...',
      environment: FEDAPAY_ENVIRONMENT,
    });

    const transactionData = {
      description,
      amount,
      currency: {
        iso: 'XOF', // Franc CFA
      },
      customer: {
        firstname: customerName?.split(' ')[0] || 'Client',
        lastname: customerName?.split(' ').slice(1).join(' ') || 'BusBenin',
        email: customerEmail,
        phone_number: {
          number: customerPhone,
          country: 'BJ', // Bénin
        },
      },
    };

    // Ajouter le callback_url seulement s'il est fourni et valide (HTTP/HTTPS)
    if (callbackUrl && (callbackUrl.startsWith('http://') || callbackUrl.startsWith('https://'))) {
      transactionData.callback_url = callbackUrl;
    }

    // Ajouter le mode de paiement si l'opérateur est spécifié
    if (mobileMoneyOperator) {
      transactionData.mode = mobileMoneyOperator;
    }

    console.log('FedaPay Request:', {
      url: `${getBaseUrl()}/transactions`,
      environment: FEDAPAY_ENVIRONMENT,
      data: transactionData,
    });

    const response = await fetch(`${getBaseUrl()}/transactions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(transactionData),
    });

    const data = await response.json();

    console.log('FedaPay Response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: {
        contentType: response.headers.get('content-type'),
      },
      data,
    });

    if (!response.ok) {
      // Afficher tous les détails de l'erreur
      const errorDetails = JSON.stringify(data, null, 2);
      console.error('FedaPay Error Details:', errorDetails);
      
      const errorMessage = data.message || data.error || data.v1?.message || 'Erreur lors de la création de la transaction';
      throw new Error(`${errorMessage} (Status: ${response.status})`);
    }

    // FedaPay retourne les données dans "v1/transaction" (avec un slash)
    const transaction = data['v1/transaction'] || data.transaction || data.v1?.transaction;
    
    console.log('Transaction extracted:', {
      id: transaction?.id,
      hasToken: !!transaction?.payment_token,
      hasUrl: !!transaction?.payment_url,
      status: transaction?.status,
    });

    // Construire l'URL de paiement comme sur le web
    const paymentUrl = getPaymentUrl(transaction?.payment_url || transaction?.payment_token);

    return {
      success: true,
      transaction: transaction,
      transactionId: transaction?.id,
      token: transaction?.payment_token,
      paymentUrl,
    };
  } catch (error) {
    console.error('Erreur création transaction FedaPay:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de la création de la transaction',
    };
  }
};

/**
 * Déclencher un paiement sans redirection à partir d'un token
 * @param {Object} params
 * @param {string} params.mode - Méthode de paiement ('mtn', 'moov', 'celtiis', etc.)
 * @param {string} params.token - Token de paiement FedaPay
 * @param {{ number: string, country: string }} [params.phoneNumber] - Numéro de téléphone local + pays
 */
export const sendPaymentWithToken = async ({ mode, token, phoneNumber }) => {
  try {
    if (!mode || !token) {
      throw new Error('Mode de paiement ou token manquant pour le paiement sans redirection');
    }

    // D'après la doc "Send payment to user":
    // Base URL: https://sandbox-api.fedapay.com/v1
    // Endpoint:  /transactions/{mode}  (mode = 'mtn', 'moov', ...)
    const url = `${getBaseUrl()}/transactions/${mode}`;

    const body = {
      token,
    };

    if (phoneNumber?.number && phoneNumber?.country) {
      body.phone_number = {
        number: phoneNumber.number,
        country: phoneNumber.country,
      };
    }

    console.log('FedaPay sendPaymentWithToken Request:', {
      url,
      mode,
      body,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    const rawText = await response.text();
    let data = null;

    if (rawText) {
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        // Réponse non JSON, on garde le texte brut pour debug
        data = { raw: rawText };
      }
    }

    console.log('FedaPay sendPaymentWithToken Response:', {
      status: response.status,
      ok: response.ok,
      data,
    });

    if (!response.ok) {
      const errorMessage = (data && (data.message || data.error)) || 'Erreur lors du déclenchement du paiement';
      throw new Error(`${errorMessage} (Status: ${response.status})`);
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Erreur sendPaymentWithToken FedaPay:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Générer le lien de paiement
 * @param {string} token - Token de la transaction OU l'URL complète si déjà fournie
 * @returns {string} - URL de paiement
 */
export const getPaymentUrl = (token) => {
  // Si c'est déjà une URL complète, la retourner directement
  if (token?.startsWith('http://') || token?.startsWith('https://')) {
    return token;
  }
  
  // Sinon, construire l'URL avec le token
  const baseUrl = FEDAPAY_ENVIRONMENT === 'sandbox' 
    ? 'https://sandbox-process.fedapay.com'
    : 'https://process.fedapay.com';
  return `${baseUrl}/${token}`;
};

/**
 * Vérifier le statut d'une transaction
 * @param {string} transactionId - ID de la transaction
 * @returns {Promise<Object>} - Statut de la transaction
 */
export const checkTransactionStatus = async (transactionId) => {
  try {
    const response = await fetch(`${getBaseUrl()}/transactions/${transactionId}`, {
      method: 'GET',
      headers: getHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Erreur lors de la vérification de la transaction');
    }

    // FedaPay retourne les données dans "v1/transaction" (avec un slash)
    const transaction = data['v1/transaction'] || data.transaction || data.v1?.transaction;
    
    return {
      success: true,
      status: transaction?.status, // 'pending', 'approved', 'declined', 'canceled'
      transaction,
    };
  } catch (error) {
    console.error('Erreur vérification transaction:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export default {
  createTransaction,
  getPaymentUrl,
  checkTransactionStatus,
  sendPaymentWithToken,
};
