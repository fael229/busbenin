import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';

/**
 * Génère un PDF de facture pour une réservation
 * @param {Object} reservation - Données de la réservation
 * @returns {Promise<string>} - URI du fichier PDF généré
 */
export const generateReservationPDF = async (reservation) => {
  try {
    const html = generateReceiptHTML(reservation);
    
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
      margins: {
        left: 20,
        top: 20,
        right: 20,
        bottom: 20,
      },
    });

    return uri;
  } catch (error) {
    console.error('Erreur génération PDF:', error);
    throw new Error('Impossible de générer le PDF');
  }
};

/**
 * Partage le PDF de facture
 * @param {Object} reservation - Données de la réservation
 */
export const shareReservationPDF = async (reservation) => {
  try {
    const pdfUri = await generateReservationPDF(reservation);
    
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Facture de réservation',
        UTI: 'com.adobe.pdf',
      });
    } else {
      Alert.alert('Information', 'Le partage n\'est pas disponible sur cet appareil');
    }
  } catch (error) {
    console.error('Erreur partage PDF:', error);
    Alert.alert('Erreur', 'Impossible de partager la facture');
  }
};

/**
 * Sauvegarde le PDF dans la galerie/téléchargements
 * @param {Object} reservation - Données de la réservation
 */
export const downloadReservationPDF = async (reservation) => {
  try {
    // Demander les permissions
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permissions requises',
        'Veuillez autoriser l\'accès aux fichiers pour télécharger la facture'
      );
      return;
    }

    const pdfUri = await generateReservationPDF(reservation);
    
    // Créer un nom de fichier unique
    const fileName = `facture_${reservation.id.substring(0, 8)}_${new Date().getTime()}.pdf`;
    const downloadPath = `${FileSystem.documentDirectory}${fileName}`;
    
    // Copier le fichier vers le répertoire de téléchargements
    await FileSystem.copyAsync({
      from: pdfUri,
      to: downloadPath,
    });

    // Sauvegarder dans la médiathèque
    const asset = await MediaLibrary.createAssetAsync(downloadPath);
    await MediaLibrary.createAlbumAsync('Bus Bénin', asset, false);
    
    Alert.alert(
      'Téléchargement réussi',
      `La facture a été sauvegardée dans l'album "Bus Bénin"`,
      [{ text: 'OK' }]
    );
  } catch (error) {
    console.error('Erreur téléchargement PDF:', error);
    Alert.alert('Erreur', 'Impossible de télécharger la facture');
  }
};

/**
 * Génère le HTML pour la facture
 * @param {Object} reservation - Données de la réservation
 * @returns {string} - HTML de la facture
 */
const generateReceiptHTML = (reservation) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'Non définie';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Non définie';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          border-bottom: 3px solid #1E88E5;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          color: #1E88E5;
          margin-bottom: 5px;
        }
        .subtitle {
          color: #666;
          font-size: 16px;
        }
        .invoice-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
        }
        .invoice-box {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          flex: 1;
          margin: 0 10px;
        }
        .invoice-box h3 {
          margin: 0 0 10px 0;
          color: #1E88E5;
          font-size: 16px;
        }
        .invoice-box p {
          margin: 5px 0;
          font-size: 14px;
        }
        .details-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        .details-table th,
        .details-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        .details-table th {
          background-color: #1E88E5;
          color: white;
          font-weight: bold;
        }
        .details-table tr:nth-child(even) {
          background-color: #f8f9fa;
        }
        .total-section {
          background: #1E88E5;
          color: white;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          margin-bottom: 30px;
        }
        .total-amount {
          font-size: 24px;
          font-weight: bold;
          margin: 10px 0;
        }
        .status-badge {
          display: inline-block;
          padding: 5px 15px;
          border-radius: 20px;
          font-weight: bold;
          font-size: 14px;
        }
        .status-approved {
          background-color: #d4edda;
          color: #155724;
        }
        .status-pending {
          background-color: #fff3cd;
          color: #856404;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          color: #666;
          font-size: 12px;
        }
        .contact-info {
          margin-top: 20px;
          text-align: center;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">🚌 Bus Bénin</div>
        <div class="subtitle">Plateforme de transport inter-urbain</div>
      </div>

      <div class="invoice-info">
        <div class="invoice-box">
          <h3>📋 Facture N°</h3>
          <p><strong>${reservation.id.substring(0, 8).toUpperCase()}</strong></p>
          <p>Date d'émission:</p>
          <p>${formatDateTime(reservation.created_at)}</p>
        </div>
        
        <div class="invoice-box">
          <h3>👤 Informations voyageur</h3>
          <p><strong>${reservation.nom_passager}</strong></p>
          <p>📞 ${reservation.telephone_passager}</p>
          ${reservation.email_passager ? `<p>✉️ ${reservation.email_passager}</p>` : ''}
        </div>
      </div>

      <table class="details-table">
        <thead>
          <tr>
            <th>🛣️ Trajet</th>
            <th>📅 Date de voyage</th>
            <th>🕐 Horaire</th>
            <th>👥 Places</th>
            <th>💰 Prix unitaire</th>
            <th>💳 Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>${reservation.trajets?.depart} → ${reservation.trajets?.arrivee}</strong>
              <br>
              <small style="color: #666;">${reservation.trajets?.compagnies?.nom || 'Compagnie non définie'}</small>
            </td>
            <td>${formatDate(reservation.date_voyage)}</td>
            <td>${reservation.horaire}</td>
            <td>${reservation.nb_places}</td>
            <td>${(reservation.montant_total / reservation.nb_places).toLocaleString('fr-FR')} FCFA</td>
            <td><strong>${reservation.montant_total.toLocaleString('fr-FR')} FCFA</strong></td>
          </tr>
        </tbody>
      </table>

      <div class="total-section">
        <div>💳 <strong>Montant Total</strong></div>
        <div class="total-amount">${reservation.montant_total.toLocaleString('fr-FR')} FCFA</div>
        <div>
          Statut du paiement: 
          <span class="status-badge ${reservation.statut_paiement === 'approved' ? 'status-approved' : 'status-pending'}">
            ${reservation.statut_paiement === 'approved' ? '✅ Payé' : '⏳ En attente'}
          </span>
        </div>
        ${reservation.fedapay_transaction_id ? `
          <div style="margin-top: 10px;">
            <small>ID Transaction: ${reservation.fedapay_transaction_id}</small>
          </div>
        ` : ''}
      </div>

      <div class="contact-info">
        <p><strong>Bus Bénin</strong> - Votre plateforme de transport de confiance</p>
        <p>📧 contact@busbenin.bj | 📞 +229 XX XX XX XX</p>
        <p>🌐 www.busbenin.bj</p>
      </div>

      <div class="footer">
        <p>Cette facture est générée automatiquement et constitue un justificatif de réservation valide.</p>
        <p>En cas de questions, veuillez nous contacter avec le numéro de facture ci-dessus.</p>
        <p>Bon voyage avec Bus Bénin ! 🚌✨</p>
      </div>
    </body>
    </html>
  `;
};
