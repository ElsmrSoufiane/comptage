// App.js
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import './App.css';

// Liste de prix statique - modifiez ce tableau directement dans le code
const STATIC_PRICE_LIST = [
  { code: 'PROD001', price: 25.50 },
  { code: 'PROD002', price: 12.75 },
  { code: 'PROD003', price: 8.90 },
  { code: 'PROD004', price: 45.00 },
  { code: 'PROD005', price: 33.25 },
  // Ajoutez d'autres produits selon vos besoins
  // Format: { code: 'CODE_PRODUIT', price: 99.99 }
];

function App() {
  const [stockData, setStockData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [fileName, setFileName] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [physicalQuantity, setPhysicalQuantity] = useState('');
  const [isCounting, setIsCounting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [hasQtéPhys, setHasQtéPhys] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    counted: 0,
    remaining: 0,
    totalValue: 0
  });

  // Fonction pour obtenir le prix depuis la liste statique
  const getProductPrice = (code) => {
    const priceItem = STATIC_PRICE_LIST.find(item => item.code === code);
    return priceItem ? priceItem.price : 0;
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Get headers and data
      const headers = jsonData[0];
      
      // Check if required columns exist
      const requiredColumns = ['Article', 'Code', 'QtéSys', 'Écart', 'ValÉcart'];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));
      
      if (missingColumns.length > 0) {
        alert(`Colonnes manquantes: ${missingColumns.join(', ')}`);
        return;
      }

      // Check if QtéPhys column already exists
      const hasPhysColumn = headers.includes('QtéPhys');
      setHasQtéPhys(hasPhysColumn);

      // Convert to objects without modifying headers
      const rows = jsonData.slice(1).map(row => {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        obj['counted'] = false;
        return obj;
      });

      setStockData(rows);
      setFilteredData(rows);
      updateStats(rows);
    };

    reader.readAsArrayBuffer(file);
  };

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

  const startCounting = (index = 0) => {
    setCurrentIndex(index);
    setSelectedProduct(filteredData[index]);
    setPhysicalQuantity(filteredData[index]['QtéPhys'] || '');
    setIsCounting(true);
    setViewMode('count');
  };

  const handleProductSelect = (product, index) => {
    setSelectedProduct(product);
    setCurrentIndex(index);
    setPhysicalQuantity(product['QtéPhys'] || '');
    setIsCounting(true);
    setViewMode('count');
  };

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
      
      // Update QtéPhys (whether it existed or not)
      currentItem['QtéPhys'] = physicalQuantity;
      
      // Calculate and update Écart (QtéPhys - QtéSys)
      const ecart = physicalQty - systemQty;
      currentItem['Écart'] = ecart;
      
      // Calculate and update ValÉcart (Écart * price)
      currentItem['ValÉcart'] = ecart * price;
      
      currentItem['counted'] = true;

      setStockData(updatedData);
      updateStats(updatedData);
      
      // Update filtered data
      const newFilteredData = applyFilters(updatedData);
      setFilteredData(newFilteredData);
    }

    setPhysicalQuantity('');
    setSelectedProduct(null);
    setIsCounting(false);
    setViewMode('list');
  };

  const handleCancelCount = () => {
    setSelectedProduct(null);
    setIsCounting(false);
    setViewMode('list');
    setPhysicalQuantity('');
  };

  const applyFilters = (data) => {
    let filtered = [...data];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        (item['Article'] && item['Article'].toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item['Code'] && item['Code'].toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply status filter
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

  const exportToExcel = () => {
    // Prepare data for export - only keep original columns
    const exportData = stockData.map(item => {
      const { counted, ...rest } = item; // Remove internal tracking field
      return rest;
    });

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventaire');
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const exportFileName = `inventaire_complete_${timestamp}.xlsx`;
    
    // Save file
    XLSX.writeFile(wb, exportFileName);
  };

  const currentItem = selectedProduct || {};

  return (
    <div className="App">
      <header className="app-header">
        <h1>📦 Comptage - Application d'Inventaire</h1>
      </header>

      <main className="app-main">
        {!stockData.length ? (
          <div className="upload-section">
            <h2>Charger un fichier Excel</h2>
            <p>Le fichier doit contenir les colonnes: Article, Code, QtéSys, Écart, ValÉcart</p>
            <p className="note">La colonne QtéPhys sera utilisée si elle existe déjà</p>
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              onChange={handleFileUpload}
              className="file-input"
            />
          </div>
        ) : (
          <div className="dashboard">
            <div className="dashboard-header">
              <div className="file-info">
                <span>Fichier: {fileName}</span>
                <span>Total: {stats.total}</span>
                <span>Comptés: {stats.counted}</span>
                <span>Restants: {stats.remaining}</span>
                <span>Valeur Totale: {stats.totalValue.toFixed(2)}</span>
              </div>

              <div className="dashboard-actions">
                <button onClick={exportToExcel} className="btn btn-success">
                  Exporter vers Excel
                </button>
              </div>
            </div>

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
                      Tous
                    </button>
                    <button 
                      className={`btn btn-filter ${filterType === 'uncounted' ? 'active' : ''}`}
                      onClick={() => setFilterType('uncounted')}
                    >
                      Non comptés
                    </button>
                    <button 
                      className={`btn btn-filter ${filterType === 'counted' ? 'active' : ''}`}
                      onClick={() => setFilterType('counted')}
                    >
                      Comptés
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
                          <span>Système: {item['QtéSys']}</span>
                          {item.counted && (
                            <span>Physique: {item['QtéPhys']}</span>
                          )}
                        </div>
                        <div className="product-price">
                          Prix: {getProductPrice(item['Code']).toFixed(2)}
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
                    ← Retour
                  </button>
                  <h2>Compter le produit</h2>
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
                        <label>ValÉcart actuel:</label>
                        <span className="value">{selectedProduct['ValÉcart']}</span>
                      </div>
                      <div className="detail-item">
                        <label>Prix unitaire:</label>
                        <span className="value price">
                          {getProductPrice(selectedProduct['Code']).toFixed(2)}
                        </span>
                      </div>
                      {physicalQuantity && (
                        <div className="detail-item preview">
                          <label>Aperçu:</label>
                          <span className="value">
                            Nouvel Écart: {parseFloat(physicalQuantity || 0) - parseFloat(selectedProduct['QtéSys'] || 0)}
                            <br />
                            Nouveau ValÉcart: {(parseFloat(physicalQuantity || 0) - parseFloat(selectedProduct['QtéSys'] || 0)) * getProductPrice(selectedProduct['Code'])}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="input-section">
                      <label htmlFor="physicalQty">QtéPhys (Quantité Physique):</label>
                      <input
                        id="physicalQty"
                        type="number"
                        value={physicalQuantity}
                        onChange={(e) => setPhysicalQuantity(e.target.value)}
                        placeholder="Saisir la quantité physique"
                        autoFocus
                      />
                    </div>

                    <div className="button-group">
                      <button onClick={handleSaveCount} className="btn btn-primary btn-large">
                        Enregistrer
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