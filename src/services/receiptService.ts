import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

interface ReceiptData {
  dossierId: string;
  reference: string;
  spouse1Name: string;
  spouse2Name: string;
  weddingDate: string;
  salleNom: string;
  montant: number;
  datePaiement: string;
}

async function fetchImageAsBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error("fetchImageAsBase64 error:", err);
    return '';
  }
}

export async function generateReceiptPdf(data: ReceiptData): Promise<void> {
  // 1. Generate QR Code as DataURL
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://e-mariage.ci';
  const qrCodeUrl = `${baseUrl}/verify-receipt/${data.dossierId}`;
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(qrCodeUrl, { width: 120, margin: 1 });
  } catch (err) {
    console.error("Failed to generate QR Code for receipt", err);
  }

  // 2. Fetch Logo Image
  let logoBase64 = '';
  try {
    logoBase64 = await fetchImageAsBase64('/logo.png');
  } catch (err) {
    console.error("Failed to load logo.png for PDF receipt", err);
  }

  // 3. Create jsPDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5' // A5 size is elegant for receipts
  });

  // Colors
  const primaryColor = [186, 12, 47]; // #BA0C2F (Mairie / Rouge bordeaux élégant)
  const darkTextColor = [30, 41, 59]; // Slate 800
  const lightTextColor = [100, 116, 139]; // Slate 500
  const borderBg = [248, 250, 252]; // Slate 50

  // Frame and Header Background
  doc.setFillColor(borderBg[0], borderBg[1], borderBg[2]);
  doc.rect(5, 5, 138, 200, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(5, 5, 138, 200, 'D');

  // Header Title
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.text("RÉPUBLIQUE DE CÔTE D'IVOIRE", 74, 15, { align: 'center' });
  
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.setFontSize(8);
  doc.setFont('Helvetica', 'normal');
  doc.text("Union - Discipline - Travail", 74, 20, { align: 'center' });

  // Mairie Logo Image or Text representation
  if (logoBase64) {
    // Add logo to PDF (18x18 mm centered)
    doc.addImage(logoBase64, 'PNG', 65, 23, 18, 18);
  } else {
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(40, 28, 68, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text("MAIRIE DE MARCORY", 74, 33, { align: 'center' });
  }

  // Receipt details header
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.setFontSize(11);
  doc.setFont('Helvetica', 'bold');
  doc.text("REÇU NUMÉRIQUE DE RÉSERVATION", 74, 48, { align: 'center' });

  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.5);
  doc.line(20, 51, 128, 51);

  // Formatted ID
  const shortId = `MAR-2026-${data.dossierId.substring(0, 5).toUpperCase()}`;

  // Content block
  doc.setFontSize(9);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
  doc.text("N° Dossier :", 15, 61);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.setFont('Helvetica', 'bold');
  doc.text(shortId, 55, 61);

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
  doc.text("Réf. Transaction :", 15, 68);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text(data.reference, 55, 68);

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
  doc.text("Époux :", 15, 78);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.setFont('Helvetica', 'bold');
  doc.text(data.spouse1Name, 55, 78);

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
  doc.text("Épouse :", 15, 85);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.setFont('Helvetica', 'bold');
  doc.text(data.spouse2Name, 55, 85);

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
  doc.text("Date & Heure célébration :", 15, 95);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text(data.weddingDate, 55, 95);

  doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
  doc.text("Salle assignée :", 15, 102);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.setFont('Helvetica', 'bold');
  doc.text(data.salleNom, 55, 102);

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
  doc.text("Montant payé :", 15, 112);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`${data.montant} FCFA`, 55, 112);

  doc.setFontSize(9);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
  doc.text("Date de paiement :", 15, 119);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text(new Date(data.datePaiement).toLocaleString('fr-FR'), 55, 119);

  // Add QR Code
  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'JPEG', 59, 129, 30, 30);
  }

  // Footer Instructions
  doc.setFontSize(7.5);
  doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
  doc.text("Présentez ce reçu muni de son QR Code scannable lors de votre rendez-vous physique en mairie.", 74, 168, { align: 'center' });
  doc.text("Vous recevrez les détails de votre rendez-vous (J-15) par notification WhatsApp.", 74, 173, { align: 'center' });

  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('Helvetica', 'bold');
  doc.text("Mairie de Marcory — Service de l'État Civil Numérique", 74, 183, { align: 'center' });

  // Save the PDF
  doc.save(`recu_reservation_${data.dossierId}.pdf`);
}
