// App.js - Version complète et corrigée
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import './App.css';

// Configuration Cloudinary
const CLOUD_NAME = 'dij7fqfot';
const UPLOAD_PRESET = 'soufiane';

// Liste de prix statique
const STATIC_PRICE_LIST = [
  { code: 'PROD001', price: 25.50 },
  { code: 'PROD002', price: 12.75 },
  { code: 'PROD003', price: 8.90 },
  { code: 'PROD004', price: 45.00 },
  { code: 'PROD005', price: 33.25 },
];

// 5 comptes avec numéros WhatsApp
const COMPANY_PEOPLE = [
  { 
    id: 1, 
    name: 'lasmar soufiane', 
    phone: '212766548709',
    whatsapp: '212766548709'
  }, { 
    id: 2, 
    name: 'lasmar soufiane2', 
    phone: '212766548709',
    whatsapp: '212766548709'
  }
];

function App() {
  const [stockData, setStockData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [fileName, setFileName] = useState('');
  const [originalFileArrayBuffer, setOriginalFileArrayBuffer] = useState(null);
  const [originalFileBlob, setOriginalFileBlob] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [physicalQuantity, setPhysicalQuantity] = useState('');
  const [isCounting, setIsCounting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [stats, setStats] = useState({
    total: 0,
    counted: 0,
    remaining: 0,
    totalValue: 0
  });
  
  // Document routing state
  const [showRoutingModal, setShowRoutingModal] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [routingHistory, setRoutingHistory] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showUserSelect, setShowUserSelect] = useState(true);
  const [routingNote, setRoutingNote] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [sendType, setSendType] = useState('initial');
  const [sending, setSending] = useState(false);

  // Fonction pour normaliser les noms de colonnes
  const normalizeColumnName = (name) => {
    if (!name) return '';
    return name.toString()
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9]/g, '');
  };

  // Fonction pour obtenir le prix depuis la liste statique
  const getProductPrice = (code) => {
    const priceItem = STATIC_PRICE_LIST.find(item => item.code === code);
    return priceItem ? priceItem.price : 0;
  };

  // Gérer la sélection de l'utilisateur courant
  const handleUserSelect = (userId) => {
    const user = COMPANY_PEOPLE.find(p => p.id === parseInt(userId));
    setCurrentUser(user);
    setShowUserSelect(false);
    addNotification(`Bienvenue ${user.name}`, 'success');
  };

  // Ajouter une notification
  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // Upload vers Cloudinary
  const uploadToCloudinary = async (blob, fileName) => {
    setSending(true);
    addNotification('Upload vers Cloudinary...', 'info');

    try {
      // Vérifier que le blob est valide
      if (!blob || blob.size === 0) {
        throw new Error('Blob invalide ou vide');
      }

      console.log('📦 Uploading blob:', {
        size: blob.size,
        type: blob.type,
        name: fileName
      });

      // Convertir blob en fichier
      const file = new File([blob], fileName, { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', 'inventory_files');
      formData.append('public_id', `inventory_${Date.now()}`);
      
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.secure_url) {
        addNotification('Fichier uploadé avec succès sur Cloudinary!', 'success');
        setSending(false);
        return data.secure_url;
      } else {
        throw new Error(data.error?.message || 'Upload failed');
      }
    } catch (error) {
      console.error('❌ Erreur upload Cloudinary:', error);
      addNotification('Erreur lors de l\'upload: ' + error.message, 'error');
      setSending(false);
      return null;
    }
  };

  // Partager via WhatsApp avec lien Cloudinary
  const shareViaWhatsApp = (url, messageType) => {
    if (!selectedRecipient) {
      alert('Veuillez sélectionner un destinataire');
      return false;
    }

    const recipient = COMPANY_PEOPLE.find(p => p.id === parseInt(selectedRecipient));
    
    // Formater le message pour WhatsApp
    let message = '';
    if (messageType === 'initial') {
      message = `📊 *DEMANDE DE COMPTAGE*%0a%0a` +
                `👤 *De:* ${currentUser.name}%0a` +
                `👤 *Pour:* ${recipient.name}%0a%0a` +
                `📁 *Fichier à compter:* ${fileName}%0a` +
                `📊 *Total articles à compter:* ${stats.total}%0a%0a` +
                `📝 *Message:* ${routingNote || 'Pas de message'}%0a%0a` +
                `🔗 *LIEN DU FICHIER EXCEL:*%0a` +
                `${url}%0a%0a` +
                `⬇️ *Instructions:*%0a` +
                `1. Cliquez sur le lien ci-dessus ☝️%0a` +
                `2. Téléchargez le fichier Excel%0a` +
                `3. Ouvrez le fichier dans Excel%0a` +
                `4. Saisissez les quantités physiques (QtéPhys)%0a` +
                `5. Sauvegardez le fichier%0a` +
                `6. Renvoyez-le moi%0a%0a` +
                `Merci pour votre aide! 🙏`;
    } else {
      message = `✅ *COMPTAGE TERMINÉ*%0a%0a` +
                `👤 *De:* ${currentUser.name}%0a` +
                `👤 *Pour:* ${recipient.name}%0a%0a` +
                `📊 *RÉSULTATS DU COMPTAGE:*%0a` +
                `• Total articles: ${stats.total}%0a` +
                `• ✅ Comptés: ${stats.counted}%0a` +
                `• ⏳ Restants: ${stats.remaining}%0a` +
                `• 💰 Valeur totale des écarts: ${stats.totalValue.toFixed(2)} DH%0a%0a` +
                `📝 *Message:* ${routingNote || 'Pas de message'}%0a%0a` +
                `🔗 *LIEN DU FICHIER COMPTÉ:*%0a` +
                `${url}%0a%0a` +
                `👆 Cliquez sur le lien pour télécharger le fichier final%0a%0a` +
                `Cordialement,%0a${currentUser.name}`;
    }

    // Ouvrir WhatsApp avec le message pré-rempli
    const whatsappUrl = `https://wa.me/${recipient.whatsapp}?text=${message}`;
    window.open(whatsappUrl, '_blank');

    // Créer l'historique
    const newRoutingEntry = {
      id: Date.now(),
      from: currentUser,
      to: recipient,
      date: new Date().toLocaleString('fr-FR'),
      note: routingNote || (messageType === 'initial' ? 'Demande de comptage' : 'Comptage terminé'),
      fileName: fileName,
      type: messageType,
      method: 'whatsapp',
      cloudinaryUrl: url,
      stats: messageType === 'final' ? {
        total: stats.total,
        counted: stats.counted,
        remaining: stats.remaining,
        totalValue: stats.totalValue
      } : null
    };

    setRoutingHistory(prev => [...prev, newRoutingEntry]);
    addNotification(`Message WhatsApp préparé pour ${recipient.name}`, 'success');
    
    return true;
  };

  // Envoyer la demande de comptage (fichier initial)
  const sendInitialFile = async () => {
    if (!selectedRecipient) {
      alert('Veuillez sélectionner un destinataire');
      return;
    }

    setSending(true);
    addNotification('Préparation du fichier...', 'info');

    try {
      let blobToSend = originalFileBlob;
      
      // Si le blob n'existe pas mais que l'arrayBuffer existe, recréer le blob
      if (!blobToSend && originalFileArrayBuffer) {
        console.log('🔄 Recréation du blob depuis arrayBuffer');
        blobToSend = new Blob([originalFileArrayBuffer], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        setOriginalFileBlob(blobToSend);
      }

      if (!blobToSend) {
        throw new Error('Aucun fichier disponible. Veuillez recharger le fichier.');
      }

      console.log('📦 Blob prêt:', {
        size: blobToSend.size,
        type: blobToSend.type
      });

      // Nom du fichier
      const timestamp = new Date().toISOString().slice(0,10);
      const safeName = currentUser.name.replace(/\s+/g, '_');
      const fileName = `DEMANDE_COMPTAGE_${safeName}_${timestamp}.xlsx`;

      // Upload vers Cloudinary
      const url = await uploadToCloudinary(blobToSend, fileName);
      
      if (url) {
        shareViaWhatsApp(url, 'initial');
        setShowRoutingModal(false);
        setSelectedRecipient('');
        setRoutingNote('');
        addNotification('✅ Demande de comptage envoyée!', 'success');
      }
    } catch (error) {
      console.error('❌ Erreur:', error);
      alert(error.message);
    } finally {
      setSending(false);
    }
  };

  // Envoyer le fichier compté (fichier final)
  const sendFinalFile = async () => {
    if (!selectedRecipient) {
      alert('Veuillez sélectionner un destinataire');
      return;
    }

    setSending(true);
    addNotification('Préparation du fichier final...', 'info');

    try {
      // Créer le fichier Excel final avec les quantités comptées
      const exportData = stockData.map(item => {
        const exportItem = {};
        headers.forEach(header => {
          exportItem[header] = item[header];
        });
        return exportItem;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Inventaire');
      
      // Convertir en blob
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const timestamp = new Date().toISOString().slice(0,10);
      const safeName = currentUser.name.replace(/\s+/g, '_');
      const fileName = `COMPTAGE_FINAL_${safeName}_${timestamp}.xlsx`;
      
      // Upload vers Cloudinary
      const url = await uploadToCloudinary(blob, fileName);
      
      if (url) {
        shareViaWhatsApp(url, 'final');
        setShowRoutingModal(false);
        setSelectedRecipient('');
        setRoutingNote('');
        addNotification('✅ Résultats du comptage envoyés!', 'success');
      }
    } catch (error) {
      console.error('❌ Erreur:', error);
      alert('Erreur lors de l\'envoi du fichier compté: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  // Charger un document depuis localStorage
  const loadSavedDocument = () => {
    const saved = localStorage.getItem('inventory_document');
    if (saved) {
      try {
        const doc = JSON.parse(saved);
        setStockData(doc.stockData || []);
        setFileName(doc.fileName || '');
        setHeaders(doc.headers || []);
        setColumnMapping(doc.columnMapping || {});
        setStats(doc.stats || { total: 0, counted: 0, remaining: 0, totalValue: 0 });
        setRoutingHistory(doc.routingHistory || []);
        
        addNotification('Document chargé depuis la session précédente', 'info');
      } catch (error) {
        console.error('Error loading saved document:', error);
      }
    }
  };

  useEffect(() => {
    loadSavedDocument();
  }, []);

  // Gérer l'upload de fichier
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setFileName(file.name);
    addNotification(`Chargement du fichier: ${file.name}`, 'info');
    
    // Lire le fichier comme ArrayBuffer
    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target.result;
      
      // Sauvegarder l'ArrayBuffer
      setOriginalFileArrayBuffer(arrayBuffer);
      
      // Créer et sauvegarder le BLOB
      const blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      setOriginalFileBlob(blob);
      
      console.log('✅ Fichier original sauvegardé:', {
        arrayBufferSize: arrayBuffer.byteLength,
        blobSize: blob.size
      });
    };
    reader.readAsArrayBuffer(file);
    
    // Lire et traiter le fichier pour l'affichage
    const reader2 = new FileReader();
    reader2.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const fileHeaders = jsonData[0];
      
      // Créer le mapping des colonnes
      const mapping = {};
      fileHeaders.forEach(header => {
        const normalized = normalizeColumnName(header);
        mapping[normalized] = header;
      });
      
      setColumnMapping(mapping);

      // Vérifier les colonnes requises
      const requiredColumns = ['article', 'code', 'qtesys', 'ecart', 'valecart'];
      const missingColumns = [];
      
      requiredColumns.forEach(col => {
        if (!mapping[col]) {
          missingColumns.push(col);
        }
      });
      
      if (missingColumns.length > 0) {
        alert(`Colonnes manquantes: ${missingColumns.join(', ')}. Colonnes trouvées: ${fileHeaders.join(', ')}`);
        return;
      }

      // Vérifier la colonne QtéPhys
      const possiblePhysColumns = ['qtephys', 'qtéphys', 'quantitephysique', 'quantitephys', 'phys'];
      let physColumnFound = false;
      
      for (const possible of possiblePhysColumns) {
        if (mapping[possible]) {
          physColumnFound = true;
          break;
        }
      }
      
      if (!physColumnFound) {
        alert('La colonne QtéPhys est requise');
        return;
      }

      // Traiter les données
      const rows = jsonData.slice(1).map(row => {
        const obj = {};
        fileHeaders.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        
        const physColumn = Object.keys(mapping).find(key => 
          key.includes('qtephys') || key.includes('quantitephys')
        );
        const physColumnName = physColumn ? mapping[physColumn] : null;
        
        obj['counted'] = physColumnName && obj[physColumnName] ? obj[physColumnName].toString().trim() !== '' : false;
        return obj;
      });

      setHeaders(fileHeaders);
      setStockData(rows);
      setFilteredData(rows);
      updateStats(rows);
      
      // Ajouter à l'historique
      const newRoutingEntry = {
        id: Date.now(),
        from: { name: 'Système' },
        to: currentUser,
        date: new Date().toLocaleString('fr-FR'),
        note: 'Fichier chargé pour comptage',
        fileName: file.name,
        type: 'upload'
      };
      
      setRoutingHistory(prev => [...prev, newRoutingEntry]);
      addNotification('Fichier chargé avec succès', 'success');
    };

    reader2.readAsArrayBuffer(file);
  };

  // Mettre à jour les statistiques
  const updateStats = (data) => {
    const counted = data.filter(item => item.counted).length;
    const totalValue = data.reduce((sum, item) => {
      const price = getProductPrice(item['Code']);
      const ecart = parseFloat(item['Écart']) || 0;
      return sum + (price * Math.abs(ecart));
    }, 0);

    setStats({
      total: data.length,
      counted: counted,
      remaining: data.length - counted,
      totalValue: totalValue
    });
  };

  // Sélectionner un produit pour le comptage
  const handleProductSelect = (product, index) => {
    setSelectedProduct(product);
    setCurrentIndex(index);
    
    const physColumn = Object.keys(columnMapping).find(key => 
      key.includes('qtephys') || key.includes('quantitephys')
    );
    const physColumnName = physColumn ? columnMapping[physColumn] : 'QtéPhys';
    
    setPhysicalQuantity(product[physColumnName] || '');
    setIsCounting(true);
    setViewMode('count');
  };

  // Sauvegarder le comptage
  const handleSaveCount = () => {
    if (!physicalQuantity && physicalQuantity !== '0') {
      alert('Veuillez saisir une quantité');
      return;
    }

    const updatedData = [...stockData];
    const dataIndex = stockData.findIndex(item => 
      item['Article'] === selectedProduct['Article'] && 
      item['Code'] === selectedProduct['Code']
    );

    if (dataIndex !== -1) {
      const currentItem = updatedData[dataIndex];
      const physicalQty = parseFloat(physicalQuantity) || 0;
      const systemQty = parseFloat(currentItem['QtéSys']) || 0;
      const price = getProductPrice(currentItem['Code']);
      
      const physColumn = Object.keys(columnMapping).find(key => 
        key.includes('qtephys') || key.includes('quantitephys')
      );
      const physColumnName = physColumn ? columnMapping[physColumn] : 'QtéPhys';
      
      currentItem[physColumnName] = physicalQuantity;
      
      const ecart = physicalQty - systemQty;
      currentItem['Écart'] = ecart;
      currentItem['ValÉcart'] = ecart * price;
      currentItem['counted'] = true;

      setStockData(updatedData);
      updateStats(updatedData);
      
      const newFilteredData = applyFilters(updatedData);
      setFilteredData(newFilteredData);
    }

    setPhysicalQuantity('');
    setSelectedProduct(null);
    setIsCounting(false);
    setViewMode('list');
  };

  // Annuler le comptage
  const handleCancelCount = () => {
    setSelectedProduct(null);
    setIsCounting(false);
    setViewMode('list');
    setPhysicalQuantity('');
  };

  // Appliquer les filtres
  const applyFilters = (data) => {
    let filtered = [...data];

    if (searchTerm) {
      filtered = filtered.filter(item => 
        (item['Article'] && item['Article'].toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item['Code'] && item['Code'].toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    switch(filterType) {
      case 'counted':
        filtered = filtered.filter(item => item.counted);
        break;
      case 'uncounted':
        filtered = filtered.filter(item => !item.counted);
        break;
      default:
        break;
    }

    return filtered;
  };

  useEffect(() => {
    const filtered = applyFilters(stockData);
    setFilteredData(filtered);
  }, [searchTerm, filterType, stockData]);

  // Exporter vers Excel
  const exportToExcel = () => {
    const exportData = stockData.map(item => {
      const exportItem = {};
      headers.forEach(header => {
        exportItem[header] = item[header];
      });
      return exportItem;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventaire');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const exportFileName = `comptage_${timestamp}.xlsx`;
    
    XLSX.writeFile(wb, exportFileName);
    
    addNotification('Fichier exporté avec succès', 'success');
  };

  // Ouvrir le modal d'envoi
  const openSendModal = (type) => {
    if (type === 'initial' && !originalFileBlob && !originalFileArrayBuffer) {
      alert('Veuillez d\'abord charger un fichier Excel à compter');
      return;
    }
    setSendType(type);
    setShowRoutingModal(true);
  };

  // Fonction de test pour déboguer
  const testBlob = () => {
    if (originalFileBlob) {
      alert(`✅ Blob OK: ${originalFileBlob.size} bytes`);
      console.log('Blob details:', originalFileBlob);
    } else if (originalFileArrayBuffer) {
      alert(`⚠️ ArrayBuffer OK: ${originalFileArrayBuffer.byteLength} bytes, mais pas de blob`);
      console.log('ArrayBuffer details:', originalFileArrayBuffer);
    } else {
      alert('❌ Aucun fichier chargé');
    }
  };

  const currentItem = selectedProduct || {};
  
  const physColumnDisplay = (() => {
    const physColumn = Object.keys(columnMapping).find(key => 
      key.includes('qtephys') || key.includes('quantitephys')
    );
    return physColumn ? columnMapping[physColumn] : 'QtéPhys';
  })();

  // User selection screen
  if (showUserSelect) {
    return (
      <div className="App">
        <header className="app-header">
          <h1>📦 Application de Comptage d'Inventaire</h1>
        </header>
        <main className="app-main">
          <div className="user-select-card">
            <h2>Qui êtes-vous ?</h2>
            <p>Sélectionnez votre nom</p>
            <select 
              onChange={(e) => handleUserSelect(e.target.value)}
              className="user-select"
              defaultValue=""
            >
              <option value="" disabled>Sélectionnez un utilisateur</option>
              {COMPANY_PEOPLE.map(person => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="App">
      {/* Notifications */}
      <div className="notifications-container">
        {notifications.map(notification => (
          <div key={notification.id} className={`notification notification-${notification.type}`}>
            {notification.message}
          </div>
        ))}
      </div>

      {/* Routing Modal */}
      {showRoutingModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>
              {sendType === 'initial' ? '📤 Demander un comptage' : '✅ Envoyer les résultats du comptage'}
            </h3>
            <div className="modal-body">
              <div className="form-group">
                <label>Destinataire:</label>
                <select 
                  value={selectedRecipient} 
                  onChange={(e) => setSelectedRecipient(e.target.value)}
                  className="form-control"
                  disabled={sending}
                >
                  <option value="">Sélectionner...</option>
                  {COMPANY_PEOPLE.filter(p => p.id !== currentUser?.id).map(person => (
                    <option key={person.id} value={person.id}>
                      {person.name} (📱 {person.phone})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Message (optionnel):</label>
                <textarea
                  value={routingNote}
                  onChange={(e) => setRoutingNote(e.target.value)}
                  placeholder="Ajouter un message..."
                  className="form-control"
                  rows="3"
                  disabled={sending}
                />
              </div>

              <div className="document-summary">
                <h4>Résumé du document:</h4>
                {sendType === 'initial' ? (
                  <>
                    <p>📁 Fichier à compter: <strong>{fileName || 'Fichier Excel'}</strong></p>
                    <p>📊 Total articles à compter: <strong>{stats.total}</strong></p>
                    <p className="highlight">Ce fichier sera envoyé pour être compté</p>
                  </>
                ) : (
                  <>
                    <p>📁 Fichier: <strong>Résultats du comptage</strong></p>
                    <p>📊 Total articles: <strong>{stats.total}</strong></p>
                    <p>✅ Déjà comptés: <strong>{stats.counted}</strong></p>
                    <p>⏳ Restants à compter: <strong>{stats.remaining}</strong></p>
                    <p>💰 Valeur totale des écarts: <strong>{stats.totalValue.toFixed(2)} DH</strong></p>
                  </>
                )}
              </div>

              <div className="whatsapp-instructions">
                <h4>📱 Envoi du fichier Excel via WhatsApp :</h4>
                <ol>
                  <li>Le fichier Excel sera <strong>uploadé vers Cloudinary</strong></li>
                  <li>Un lien de téléchargement direct sera généré</li>
                  <li>WhatsApp s'ouvrira avec le message préparé</li>
                  <li>Le destinataire clique sur le lien ☝️</li>
                  <li>Il télécharge le fichier Excel directement</li>
                  <li>Il peut ouvrir le fichier et commencer le comptage</li>
                </ol>
                <p className="tip">💡 Le lien est valable indéfiniment sur Cloudinary</p>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowRoutingModal(false)} className="btn btn-secondary" disabled={sending}>
                Annuler
              </button>
              <button 
                onClick={sendType === 'initial' ? sendInitialFile : sendFinalFile} 
                className="btn btn-whatsapp"
                disabled={!selectedRecipient || sending}
              >
                {sending ? 'Upload en cours...' : sendType === 'initial' ? '📤 Envoyer la demande de comptage' : '📱 Envoyer les résultats'}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="app-header">
        <div className="header-content">
          <h1>📦 Application de Comptage d'Inventaire</h1>
          {currentUser && (
            <div className="user-info">
              <span>👤 {currentUser.name}</span>
              <span className="user-phone">📱 {currentUser.phone}</span>
            </div>
          )}
        </div>
      </header>

      <main className="app-main">
        {!stockData.length ? (
          <div className="upload-section">
            <h2>Charger un fichier Excel à compter</h2>
            <p>Le fichier doit contenir les colonnes : <strong>Article, Code, QtéSys, Écart, ValÉcart, QtéPhys</strong></p>
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              onChange={handleFileUpload}
              className="file-input"
            />
            
            {/* Bouton de test (visible seulement en développement) */}
            {process.env.NODE_ENV === 'development' && (
              <button onClick={testBlob} className="btn btn-secondary" style={{marginTop: '1rem'}}>
                🧪 Tester le fichier chargé
              </button>
            )}
            
            {routingHistory.length > 0 && (
              <div className="routing-history">
                <h3>Historique des demandes de comptage</h3>
                <div className="history-list">
                  {routingHistory.map(entry => (
                    <div key={entry.id} className="history-item">
                      <span className="history-date">{entry.date}</span>
                      <span className="history-transfer">
                        {entry.from?.name || 'Système'} → {entry.to?.name}
                      </span>
                      <span className="history-type">
                        {entry.type === 'initial' ? '📤 Demande comptage' : entry.type === 'final' ? '✅ Résultats' : '📂 Fichier chargé'}
                      </span>
                      {entry.method === 'whatsapp' && (
                        <span className="history-method">📱 WhatsApp</span>
                      )}
                      {entry.note && <span className="history-note">"{entry.note}"</span>}
                      {entry.cloudinaryUrl && (
                        <div className="history-link">
                          <a href={entry.cloudinaryUrl} target="_blank" rel="noopener noreferrer">
                            🔗 Voir le fichier Excel
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="dashboard">
            <div className="dashboard-header">
              <div className="file-info">
                <span>📁 Fichier en cours: <strong>{fileName}</strong></span>
                <span>📊 Total: {stats.total}</span>
                <span>✅ Comptés: {stats.counted}</span>
                <span>⏳ Restants: {stats.remaining}</span>
                <span>💰 Écarts: {stats.totalValue.toFixed(2)} DH</span>
              </div>

              <div className="dashboard-actions">
                <button onClick={() => openSendModal('initial')} className="btn btn-warning">
                  📤 Demander un comptage
                </button>
                <button onClick={exportToExcel} className="btn btn-success">
                  💾 Exporter Excel
                </button>
                <button onClick={() => openSendModal('final')} className="btn btn-whatsapp">
                  📱 Envoyer résultats
                </button>
              </div>
            </div>

            {/* Routing History Mini */}
            {routingHistory.length > 0 && (
              <div className="routing-history-mini">
                <h4>Dernières activités:</h4>
                <div className="history-mini-list">
                  {routingHistory.slice(-3).map(entry => (
                    <span key={entry.id} className="history-mini-item">
                      {entry.from?.name} → {entry.to?.name}
                      {entry.type === 'initial' ? ' 📤' : entry.type === 'final' ? ' ✅' : ' 📂'}
                      {entry.method === 'whatsapp' && ' 📱'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {viewMode === 'list' ? (
              <div className="list-view">
                <div className="list-controls">
                  <div className="search-box">
                    <input
                      type="text"
                      placeholder="Rechercher par Article ou Code..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="search-input"
                    />
                  </div>
                  <div className="filter-buttons">
                    <button 
                      className={`btn btn-filter ${filterType === 'all' ? 'active' : ''}`}
                      onClick={() => setFilterType('all')}
                    >
                      Tous ({stats.total})
                    </button>
                    <button 
                      className={`btn btn-filter ${filterType === 'uncounted' ? 'active' : ''}`}
                      onClick={() => setFilterType('uncounted')}
                    >
                      Non comptés ({stats.remaining})
                    </button>
                    <button 
                      className={`btn btn-filter ${filterType === 'counted' ? 'active' : ''}`}
                      onClick={() => setFilterType('counted')}
                    >
                      Comptés ({stats.counted})
                    </button>
                  </div>
                </div>

                <div className="products-grid">
                  {filteredData.map((item, index) => (
                    <div 
                      key={index} 
                      className={`product-card ${item.counted ? 'counted' : ''}`}
                      onClick={() => handleProductSelect(item, index)}
                    >
                      <div className="product-header">
                        <span className="product-code">{item['Code']}</span>
                        {item.counted && <span className="badge">✓</span>}
                      </div>
                      <div className="product-body">
                        <div className="product-article">{item['Article']}</div>
                        <div className="product-details">
                          <span>📊 Système: {item['QtéSys']}</span>
                          {item.counted && (
                            <span>✏️ Physique: {item[physColumnDisplay]}</span>
                          )}
                        </div>
                        <div className="product-price">
                          Prix: {getProductPrice(item['Code']).toFixed(2)} DH
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredData.length === 0 && (
                  <div className="no-results">
                    Aucun produit trouvé
                  </div>
                )}
              </div>
            ) : (
              <div className="count-view">
                <div className="count-header">
                  <button onClick={handleCancelCount} className="btn btn-secondary">
                    ← Retour à la liste
                  </button>
                  <h2>Comptage en cours ({currentIndex + 1}/{filteredData.length})</h2>
                </div>

                {selectedProduct && (
                  <div className="counting-interface">
                    <div className="article-details">
                      <div className="detail-item">
                        <label>Article:</label>
                        <span className="value">{selectedProduct['Article']}</span>
                      </div>
                      <div className="detail-item">
                        <label>Code:</label>
                        <span className="value">{selectedProduct['Code']}</span>
                      </div>
                      <div className="detail-item">
                        <label>Quantité Système:</label>
                        <span className="value system-qty">{selectedProduct['QtéSys']}</span>
                      </div>
                      <div className="detail-item">
                        <label>Écart actuel:</label>
                        <span className="value">{selectedProduct['Écart']}</span>
                      </div>
                      <div className="detail-item">
                        <label>Valeur écart:</label>
                        <span className="value">{selectedProduct['ValÉcart']}</span>
                      </div>
                      <div className="detail-item">
                        <label>Prix unitaire:</label>
                        <span className="value price">
                          {getProductPrice(selectedProduct['Code']).toFixed(2)} DH
                        </span>
                      </div>
                    </div>

                    <div className="input-section">
                      <label htmlFor="physicalQty">{physColumnDisplay} (Quantité Physique):</label>
                      <input
                        id="physicalQty"
                        type="number"
                        value={physicalQuantity}
                        onChange={(e) => setPhysicalQuantity(e.target.value)}
                        placeholder="Saisir la quantité comptée"
                        autoFocus
                      />
                    </div>

                    <div className="button-group">
                      <button onClick={handleSaveCount} className="btn btn-primary btn-large">
                        ✅ Enregistrer ce comptage
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;