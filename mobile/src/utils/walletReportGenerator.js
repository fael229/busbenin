import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system/legacy";
import { Alert, Platform } from "react-native";

/**
 * Génère le HTML pour un rapport de retraits validés
 * @param {Array} withdrawals - Liste des retraits validés
 * @param {Date} startDate - Date de début
 * @param {Date} endDate - Date de fin
 * @returns {string} - HTML du rapport
 */
const generateWithdrawalsReportHTML = (withdrawals, startDate, endDate) => {
  const totalAmount = withdrawals.reduce((sum, w) => sum + (w.montant || 0), 0);

  const formatDate = (dateString) => {
    if (!dateString) return "Non définie";
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "Non définie";
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const periodLabel =
    startDate && endDate
      ? `Du ${formatDate(startDate)} au ${formatDate(endDate)}`
      : "Tous les retraits validés";

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
          max-width: 1000px;
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
        .period-info {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          text-align: center;
        }
        .period-info h3 {
          margin: 0 0 5px 0;
          color: #1E88E5;
        }
        .summary-section {
          display: flex;
          justify-content: space-around;
          margin-bottom: 30px;
          gap: 15px;
        }
        .summary-box {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          flex: 1;
          border-left: 4px solid #1E88E5;
        }
        .summary-box .label {
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
          margin-bottom: 5px;
        }
        .summary-box .value {
          font-size: 24px;
          font-weight: bold;
          color: #1E88E5;
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
          font-size: 28px;
          font-weight: bold;
          margin: 10px 0;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          color: #666;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">💰 Bus Bénin - Rapport de Retraits</div>
        <div class="subtitle">Système de gestion des portefeuilles</div>
      </div>

      <div class="period-info">
        <h3>📅 Période du rapport</h3>
        <p>${periodLabel}</p>
        <p><small>Généré le ${formatDateTime(new Date())}</small></p>
      </div>

      <div class="summary-section">
        <div class="summary-box">
          <div class="label">Nombre de Retraits</div>
          <div class="value">${withdrawals.length}</div>
        </div>
        <div class="summary-box">
          <div class="label">Montant Total</div>
          <div class="value">${totalAmount.toLocaleString("fr-FR")} FCFA</div>
        </div>
      </div>

      <table class="details-table">
        <thead>
          <tr>
            <th>N°</th>
            <th>👤 Utilisateur</th>
            <th>📧 Email</th>
            <th>📞 Téléphone</th>
            <th>💰 Montant</th>
            <th>📅 Date demande</th>
            <th>✅ Date validation</th>
          </tr>
        </thead>
        <tbody>
          ${withdrawals.map((withdrawal, index) => `
            <tr>
              <td>${index + 1}</td>
              <td><strong>${withdrawal.profiles?.full_name || "Non renseigné"}</strong></td>
              <td>${withdrawal.profiles?.email || "Non renseigné"}</td>
              <td>${withdrawal.phone || withdrawal.profiles?.phone || "Non renseigné"}</td>
              <td><strong>${(withdrawal.montant || 0).toLocaleString("fr-FR")} FCFA</strong></td>
              <td>${formatDateTime(withdrawal.created_at)}</td>
              <td>${formatDateTime(withdrawal.updated_at)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <div class="total-section">
        <div>💳 <strong>Montant Total des Retraits Validés</strong></div>
        <div class="total-amount">${totalAmount.toLocaleString("fr-FR")} FCFA</div>
        <div><small>${withdrawals.length} retrait(s) validé(s)</small></div>
      </div>

      <div class="footer">
        <p><strong>Bus Bénin</strong> - Système de gestion des portefeuilles</p>
        <p>Ce rapport est généré automatiquement par le système.</p>
        <p>© ${new Date().getFullYear()} Bus Bénin. Tous droits réservés.</p>
      </div>
    </body>
    </html>
  `;
};

/**
 * Génère et partage un rapport PDF des retraits validés
 * @param {Array} withdrawals - Liste des retraits validés
 * @param {Date} startDate - Date de début (optionnelle)
 * @param {Date} endDate - Date de fin (optionnelle)
 */
export const generateAndShareWithdrawalsReport = async (
  withdrawals,
  startDate = null,
  endDate = null
) => {
  try {
    const html = generateWithdrawalsReportHTML(withdrawals, startDate, endDate);

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

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Rapport des retraits validés",
        UTI: "com.adobe.pdf",
      });
    } else {
      Alert.alert(
        "Information",
        "Le partage n'est pas disponible sur cet appareil"
      );
    }
  } catch (error) {
    console.error("Erreur génération rapport:", error);
    Alert.alert("Erreur", "Impossible de générer le rapport");
  }
};
