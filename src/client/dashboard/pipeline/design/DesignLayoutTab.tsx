import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listLayoutsForProject, attachLayoutsToProject, listLayouts, type LayoutRecord } from '../../../api/layoutsApi';
import './design-layout.css';

interface DesignLayoutTabProps {
  eventId: string;
}

type SubTab = 'layouts' | 'decor' | 'moodboard' | 'rentals';

interface DecorItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  notes: string;
  completed: boolean;
}

interface MoodBoardImage {
  id: string;
  url: string;
  caption: string;
}

interface RentalItem {
  id: string;
  name: string;
  vendor: string;
  quantity: number;
  unitPrice: number;
  pickupDate: string;
  returnDate: string;
  status: 'pending' | 'confirmed' | 'picked_up' | 'returned';
  notes: string;
}

const DECOR_CATEGORIES = [
  'Centerpieces',
  'Lighting',
  'Linens',
  'Signage',
  'Florals',
  'Ceremony',
  'Reception',
  'Other',
];

const DesignLayoutTab: React.FC<DesignLayoutTabProps> = ({ eventId }) => {
  const navigate = useNavigate();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('layouts');
  const [eventLayouts, setEventLayouts] = useState<LayoutRecord[]>([]);
  const [allLayouts, setAllLayouts] = useState<LayoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAttachModal, setShowAttachModal] = useState(false);

  // Decor state (localStorage for now)
  const [decorItems, setDecorItems] = useState<DecorItem[]>([]);
  const [showDecorForm, setShowDecorForm] = useState(false);
  const [editingDecorId, setEditingDecorId] = useState<string | null>(null);
  const [decorForm, setDecorForm] = useState({
    name: '',
    category: 'Other',
    quantity: 1,
    notes: '',
  });

  // Mood board state (localStorage for now)
  const [moodImages, setMoodImages] = useState<MoodBoardImage[]>([]);
  const [showImageForm, setShowImageForm] = useState(false);
  const [imageForm, setImageForm] = useState({ url: '', caption: '' });

  // Rentals state (localStorage for now)
  const [rentals, setRentals] = useState<RentalItem[]>([]);
  const [showRentalForm, setShowRentalForm] = useState(false);
  const [editingRentalId, setEditingRentalId] = useState<string | null>(null);
  const [rentalForm, setRentalForm] = useState({
    name: '',
    vendor: '',
    quantity: 1,
    unitPrice: 0,
    pickupDate: '',
    returnDate: '',
    notes: '',
  });

  const loadLayouts = async () => {
    setLoading(true);
    const [eventResult, allResult] = await Promise.all([
      listLayoutsForProject(eventId),
      listLayouts(),
    ]);

    if (!eventResult.error && eventResult.data) {
      setEventLayouts(eventResult.data);
    }
    if (!allResult.error && allResult.data) {
      setAllLayouts(allResult.data);
    }
    setLoading(false);
  };

  const loadLocalData = () => {
    const decorKey = `design_decor_${eventId}`;
    const moodKey = `design_mood_${eventId}`;
    const rentalKey = `design_rentals_${eventId}`;

    try {
      const savedDecor = localStorage.getItem(decorKey);
      if (savedDecor) setDecorItems(JSON.parse(savedDecor));

      const savedMood = localStorage.getItem(moodKey);
      if (savedMood) setMoodImages(JSON.parse(savedMood));

      const savedRentals = localStorage.getItem(rentalKey);
      if (savedRentals) setRentals(JSON.parse(savedRentals));
    } catch (e) {
      console.error('Error loading local design data:', e);
    }
  };

  const saveDecorItems = (items: DecorItem[]) => {
    setDecorItems(items);
    localStorage.setItem(`design_decor_${eventId}`, JSON.stringify(items));
  };

  const saveMoodImages = (images: MoodBoardImage[]) => {
    setMoodImages(images);
    localStorage.setItem(`design_mood_${eventId}`, JSON.stringify(images));
  };

  const saveRentals = (items: RentalItem[]) => {
    setRentals(items);
    localStorage.setItem(`design_rentals_${eventId}`, JSON.stringify(items));
  };

  useEffect(() => {
    loadLayouts();
    loadLocalData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const handleOpenLayout = (layoutId: string) => {
    localStorage.setItem('layout-maker-active-project-id', layoutId);
    navigate('/layout-maker');
  };

  const handleAttachLayout = async (layoutId: string) => {
    const { error } = await attachLayoutsToProject([layoutId], eventId);
    if (!error) {
      await loadLayouts();
      setShowAttachModal(false);
    }
  };

  const handleAddDecor = () => {
    if (!decorForm.name.trim()) return;

    const newItem: DecorItem = {
      id: Date.now().toString(),
      name: decorForm.name.trim(),
      category: decorForm.category,
      quantity: decorForm.quantity,
      notes: decorForm.notes.trim(),
      completed: false,
    };

    if (editingDecorId) {
      const updated = decorItems.map((item) =>
        item.id === editingDecorId ? { ...newItem, id: editingDecorId } : item
      );
      saveDecorItems(updated);
    } else {
      saveDecorItems([...decorItems, newItem]);
    }

    setDecorForm({ name: '', category: 'Other', quantity: 1, notes: '' });
    setShowDecorForm(false);
    setEditingDecorId(null);
  };

  const handleToggleDecor = (id: string) => {
    const updated = decorItems.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    saveDecorItems(updated);
  };

  const handleDeleteDecor = (id: string) => {
    saveDecorItems(decorItems.filter((item) => item.id !== id));
  };

  const handleAddMoodImage = () => {
    if (!imageForm.url.trim()) return;

    const newImage: MoodBoardImage = {
      id: Date.now().toString(),
      url: imageForm.url.trim(),
      caption: imageForm.caption.trim(),
    };

    saveMoodImages([...moodImages, newImage]);
    setImageForm({ url: '', caption: '' });
    setShowImageForm(false);
  };

  const handleDeleteMoodImage = (id: string) => {
    saveMoodImages(moodImages.filter((img) => img.id !== id));
  };

  const handleAddRental = () => {
    if (!rentalForm.name.trim()) return;

    const newRental: RentalItem = {
      id: Date.now().toString(),
      name: rentalForm.name.trim(),
      vendor: rentalForm.vendor.trim(),
      quantity: rentalForm.quantity,
      unitPrice: rentalForm.unitPrice,
      pickupDate: rentalForm.pickupDate,
      returnDate: rentalForm.returnDate,
      status: 'pending',
      notes: rentalForm.notes.trim(),
    };

    if (editingRentalId) {
      const existing = rentals.find((r) => r.id === editingRentalId);
      const updated = rentals.map((item) =>
        item.id === editingRentalId
          ? { ...newRental, id: editingRentalId, status: existing?.status || 'pending' }
          : item
      );
      saveRentals(updated);
    } else {
      saveRentals([...rentals, newRental]);
    }

    setRentalForm({
      name: '',
      vendor: '',
      quantity: 1,
      unitPrice: 0,
      pickupDate: '',
      returnDate: '',
      notes: '',
    });
    setShowRentalForm(false);
    setEditingRentalId(null);
  };

  const handleRentalStatusChange = (id: string, status: RentalItem['status']) => {
    const updated = rentals.map((item) =>
      item.id === id ? { ...item, status } : item
    );
    saveRentals(updated);
  };

  const handleDeleteRental = (id: string) => {
    saveRentals(rentals.filter((item) => item.id !== id));
  };

  const unattachedLayouts = allLayouts.filter(
    (l) => l.status === 'active' && !eventLayouts.some((el) => el.id === l.id)
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
  };

  const totalRentalCost = rentals.reduce((sum, r) => sum + r.quantity * r.unitPrice, 0);

  const renderLayoutsTab = () => (
    <div className="design-section">
      <div className="design-section-header">
        <h3>Event Layouts</h3>
        <div className="design-section-actions">
          {unattachedLayouts.length > 0 && (
            <button
              type="button"
              className="design-btn-secondary"
              onClick={() => setShowAttachModal(true)}
            >
              Link Existing
            </button>
          )}
          <button
            type="button"
            className="design-btn-primary"
            onClick={() => navigate('/layout-maker')}
          >
            + New Layout
          </button>
        </div>
      </div>

      {loading ? (
        <div className="design-loading">Loading layouts...</div>
      ) : eventLayouts.length === 0 ? (
        <div className="design-empty">
          <div className="design-empty-icon">📐</div>
          <h4>No layouts linked yet</h4>
          <p>Create floor plans and seating arrangements for this wedding.</p>
          <button
            type="button"
            className="design-btn-primary"
            onClick={() => navigate('/layout-maker')}
          >
            Create First Layout
          </button>
        </div>
      ) : (
        <div className="design-layouts-grid">
          {eventLayouts.map((layout) => (
            <div key={layout.id} className="design-layout-card">
              <div className="design-layout-thumbnail">
                <span>📐</span>
              </div>
              <div className="design-layout-info">
                <div className="design-layout-name">{layout.name}</div>
                {layout.description && (
                  <div className="design-layout-desc">{layout.description}</div>
                )}
                <div className="design-layout-meta">
                  {layout.category && <span className="design-tag">{layout.category}</span>}
                  <span className="design-layout-date">
                    Updated {new Date(layout.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="design-layout-open"
                onClick={() => handleOpenLayout(layout.id)}
              >
                Open in Layout Maker
              </button>
            </div>
          ))}
        </div>
      )}

      {showAttachModal && (
        <div className="design-modal-backdrop" onClick={() => setShowAttachModal(false)}>
          <div className="design-modal" onClick={(e) => e.stopPropagation()}>
            <div className="design-modal-header">
              <h3>Link Existing Layout</h3>
              <button
                type="button"
                className="design-modal-close"
                onClick={() => setShowAttachModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="design-modal-body">
              {unattachedLayouts.length === 0 ? (
                <p>No available layouts to link.</p>
              ) : (
                <div className="design-attach-list">
                  {unattachedLayouts.map((layout) => (
                    <div key={layout.id} className="design-attach-item">
                      <div className="design-attach-info">
                        <span className="design-attach-icon">📐</span>
                        <div>
                          <div className="design-attach-name">{layout.name}</div>
                          {layout.category && (
                            <span className="design-tag small">{layout.category}</span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="design-btn-secondary small"
                        onClick={() => handleAttachLayout(layout.id)}
                      >
                        Link
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderDecorTab = () => {
    const categorizedItems = decorItems.reduce<Record<string, DecorItem[]>>((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});

    const completedCount = decorItems.filter((i) => i.completed).length;
    const progress = decorItems.length > 0 ? Math.round((completedCount / decorItems.length) * 100) : 0;

    return (
      <div className="design-section">
        <div className="design-section-header">
          <div>
            <h3>Decor Checklist</h3>
            {decorItems.length > 0 && (
              <div className="design-progress-text">
                {completedCount}/{decorItems.length} items complete ({progress}%)
              </div>
            )}
          </div>
          <button
            type="button"
            className="design-btn-primary"
            onClick={() => {
              setShowDecorForm(true);
              setEditingDecorId(null);
              setDecorForm({ name: '', category: 'Other', quantity: 1, notes: '' });
            }}
          >
            + Add Item
          </button>
        </div>

        {decorItems.length > 0 && (
          <div className="design-progress-bar">
            <div className="design-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        )}

        {decorItems.length === 0 ? (
          <div className="design-empty">
            <div className="design-empty-icon">🎨</div>
            <h4>No decor items yet</h4>
            <p>Track centerpieces, lighting, linens, and other decor elements.</p>
            <button
              type="button"
              className="design-btn-primary"
              onClick={() => setShowDecorForm(true)}
            >
              Add First Item
            </button>
          </div>
        ) : (
          <div className="design-decor-categories">
            {Object.entries(categorizedItems).map(([category, items]) => (
              <div key={category} className="design-decor-category">
                <div className="design-decor-category-header">{category}</div>
                <div className="design-decor-items">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={`design-decor-item ${item.completed ? 'completed' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => handleToggleDecor(item.id)}
                      />
                      <div className="design-decor-item-info">
                        <span className="design-decor-item-name">{item.name}</span>
                        {item.quantity > 1 && (
                          <span className="design-decor-item-qty">×{item.quantity}</span>
                        )}
                        {item.notes && (
                          <span className="design-decor-item-notes">{item.notes}</span>
                        )}
                      </div>
                      <div className="design-decor-item-actions">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDecorId(item.id);
                            setDecorForm({
                              name: item.name,
                              category: item.category,
                              quantity: item.quantity,
                              notes: item.notes,
                            });
                            setShowDecorForm(true);
                          }}
                        >
                          ✏️
                        </button>
                        <button type="button" onClick={() => handleDeleteDecor(item.id)}>
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {showDecorForm && (
          <div className="design-modal-backdrop" onClick={() => setShowDecorForm(false)}>
            <div className="design-modal" onClick={(e) => e.stopPropagation()}>
              <div className="design-modal-header">
                <h3>{editingDecorId ? 'Edit Item' : 'Add Decor Item'}</h3>
                <button
                  type="button"
                  className="design-modal-close"
                  onClick={() => setShowDecorForm(false)}
                >
                  ✕
                </button>
              </div>
              <div className="design-modal-body">
                <div className="design-form-group">
                  <label>Item Name</label>
                  <input
                    type="text"
                    value={decorForm.name}
                    onChange={(e) => setDecorForm({ ...decorForm, name: e.target.value })}
                    placeholder="e.g., Rose gold candle holders"
                  />
                </div>
                <div className="design-form-row">
                  <div className="design-form-group">
                    <label>Category</label>
                    <select
                      value={decorForm.category}
                      onChange={(e) => setDecorForm({ ...decorForm, category: e.target.value })}
                    >
                      {DECOR_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="design-form-group">
                    <label>Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={decorForm.quantity}
                      onChange={(e) =>
                        setDecorForm({ ...decorForm, quantity: parseInt(e.target.value) || 1 })
                      }
                    />
                  </div>
                </div>
                <div className="design-form-group">
                  <label>Notes</label>
                  <textarea
                    value={decorForm.notes}
                    onChange={(e) => setDecorForm({ ...decorForm, notes: e.target.value })}
                    placeholder="Any additional details..."
                    rows={2}
                  />
                </div>
              </div>
              <div className="design-modal-footer">
                <button
                  type="button"
                  className="design-btn-secondary"
                  onClick={() => setShowDecorForm(false)}
                >
                  Cancel
                </button>
                <button type="button" className="design-btn-primary" onClick={handleAddDecor}>
                  {editingDecorId ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMoodBoardTab = () => (
    <div className="design-section">
      <div className="design-section-header">
        <h3>Mood Board</h3>
        <button
          type="button"
          className="design-btn-primary"
          onClick={() => setShowImageForm(true)}
        >
          + Add Image
        </button>
      </div>

      {moodImages.length === 0 ? (
        <div className="design-empty">
          <div className="design-empty-icon">🖼️</div>
          <h4>No inspiration images yet</h4>
          <p>Collect Pinterest pins, photos, and references for the wedding aesthetic.</p>
          <button
            type="button"
            className="design-btn-primary"
            onClick={() => setShowImageForm(true)}
          >
            Add First Image
          </button>
        </div>
      ) : (
        <div className="design-moodboard-grid">
          {moodImages.map((img) => (
            <div key={img.id} className="design-moodboard-item">
              <img src={img.url} alt={img.caption || 'Mood board image'} />
              {img.caption && <div className="design-moodboard-caption">{img.caption}</div>}
              <button
                type="button"
                className="design-moodboard-delete"
                onClick={() => handleDeleteMoodImage(img.id)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {showImageForm && (
        <div className="design-modal-backdrop" onClick={() => setShowImageForm(false)}>
          <div className="design-modal" onClick={(e) => e.stopPropagation()}>
            <div className="design-modal-header">
              <h3>Add Image</h3>
              <button
                type="button"
                className="design-modal-close"
                onClick={() => setShowImageForm(false)}
              >
                ✕
              </button>
            </div>
            <div className="design-modal-body">
              <div className="design-form-group">
                <label>Image URL</label>
                <input
                  type="url"
                  value={imageForm.url}
                  onChange={(e) => setImageForm({ ...imageForm, url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="design-form-group">
                <label>Caption (optional)</label>
                <input
                  type="text"
                  value={imageForm.caption}
                  onChange={(e) => setImageForm({ ...imageForm, caption: e.target.value })}
                  placeholder="e.g., Table centerpiece inspiration"
                />
              </div>
            </div>
            <div className="design-modal-footer">
              <button
                type="button"
                className="design-btn-secondary"
                onClick={() => setShowImageForm(false)}
              >
                Cancel
              </button>
              <button type="button" className="design-btn-primary" onClick={handleAddMoodImage}>
                Add Image
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderRentalsTab = () => (
    <div className="design-section">
      <div className="design-section-header">
        <div>
          <h3>Rental Inventory</h3>
          {rentals.length > 0 && (
            <div className="design-progress-text">
              Total: {formatCurrency(totalRentalCost)}
            </div>
          )}
        </div>
        <button
          type="button"
          className="design-btn-primary"
          onClick={() => {
            setShowRentalForm(true);
            setEditingRentalId(null);
            setRentalForm({
              name: '',
              vendor: '',
              quantity: 1,
              unitPrice: 0,
              pickupDate: '',
              returnDate: '',
              notes: '',
            });
          }}
        >
          + Add Rental
        </button>
      </div>

      {rentals.length === 0 ? (
        <div className="design-empty">
          <div className="design-empty-icon">📦</div>
          <h4>No rentals tracked yet</h4>
          <p>Track chairs, tables, linens, and other rental items.</p>
          <button
            type="button"
            className="design-btn-primary"
            onClick={() => setShowRentalForm(true)}
          >
            Add First Rental
          </button>
        </div>
      ) : (
        <div className="design-rentals-table">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Vendor</th>
                <th>Qty</th>
                <th>Cost</th>
                <th>Dates</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rentals.map((rental) => (
                <tr key={rental.id}>
                  <td>
                    <div className="design-rental-name">{rental.name}</div>
                    {rental.notes && (
                      <div className="design-rental-notes">{rental.notes}</div>
                    )}
                  </td>
                  <td>{rental.vendor || '-'}</td>
                  <td>{rental.quantity}</td>
                  <td>{formatCurrency(rental.quantity * rental.unitPrice)}</td>
                  <td>
                    {rental.pickupDate || rental.returnDate ? (
                      <>
                        {formatDate(rental.pickupDate)} → {formatDate(rental.returnDate)}
                      </>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>
                    <select
                      className={`design-rental-status ${rental.status}`}
                      value={rental.status}
                      onChange={(e) =>
                        handleRentalStatusChange(rental.id, e.target.value as RentalItem['status'])
                      }
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="picked_up">Picked Up</option>
                      <option value="returned">Returned</option>
                    </select>
                  </td>
                  <td>
                    <div className="design-rental-actions">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRentalId(rental.id);
                          setRentalForm({
                            name: rental.name,
                            vendor: rental.vendor,
                            quantity: rental.quantity,
                            unitPrice: rental.unitPrice,
                            pickupDate: rental.pickupDate,
                            returnDate: rental.returnDate,
                            notes: rental.notes,
                          });
                          setShowRentalForm(true);
                        }}
                      >
                        ✏️
                      </button>
                      <button type="button" onClick={() => handleDeleteRental(rental.id)}>
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showRentalForm && (
        <div className="design-modal-backdrop" onClick={() => setShowRentalForm(false)}>
          <div className="design-modal" onClick={(e) => e.stopPropagation()}>
            <div className="design-modal-header">
              <h3>{editingRentalId ? 'Edit Rental' : 'Add Rental Item'}</h3>
              <button
                type="button"
                className="design-modal-close"
                onClick={() => setShowRentalForm(false)}
              >
                ✕
              </button>
            </div>
            <div className="design-modal-body">
              <div className="design-form-group">
                <label>Item Name</label>
                <input
                  type="text"
                  value={rentalForm.name}
                  onChange={(e) => setRentalForm({ ...rentalForm, name: e.target.value })}
                  placeholder="e.g., Chiavari chairs"
                />
              </div>
              <div className="design-form-group">
                <label>Vendor</label>
                <input
                  type="text"
                  value={rentalForm.vendor}
                  onChange={(e) => setRentalForm({ ...rentalForm, vendor: e.target.value })}
                  placeholder="e.g., Classic Party Rentals"
                />
              </div>
              <div className="design-form-row">
                <div className="design-form-group">
                  <label>Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={rentalForm.quantity}
                    onChange={(e) =>
                      setRentalForm({ ...rentalForm, quantity: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
                <div className="design-form-group">
                  <label>Unit Price (€)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={rentalForm.unitPrice}
                    onChange={(e) =>
                      setRentalForm({ ...rentalForm, unitPrice: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
              <div className="design-form-row">
                <div className="design-form-group">
                  <label>Pickup Date</label>
                  <input
                    type="date"
                    value={rentalForm.pickupDate}
                    onChange={(e) => setRentalForm({ ...rentalForm, pickupDate: e.target.value })}
                  />
                </div>
                <div className="design-form-group">
                  <label>Return Date</label>
                  <input
                    type="date"
                    value={rentalForm.returnDate}
                    onChange={(e) => setRentalForm({ ...rentalForm, returnDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="design-form-group">
                <label>Notes</label>
                <textarea
                  value={rentalForm.notes}
                  onChange={(e) => setRentalForm({ ...rentalForm, notes: e.target.value })}
                  placeholder="Any additional details..."
                  rows={2}
                />
              </div>
            </div>
            <div className="design-modal-footer">
              <button
                type="button"
                className="design-btn-secondary"
                onClick={() => setShowRentalForm(false)}
              >
                Cancel
              </button>
              <button type="button" className="design-btn-primary" onClick={handleAddRental}>
                {editingRentalId ? 'Save Changes' : 'Add Rental'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="design-layout-tab">
      <div className="design-subtabs">
        {[
          { id: 'layouts' as SubTab, label: 'Layouts', icon: '📐' },
          { id: 'decor' as SubTab, label: 'Decor', icon: '🎨' },
          { id: 'moodboard' as SubTab, label: 'Mood Board', icon: '🖼️' },
          { id: 'rentals' as SubTab, label: 'Rentals', icon: '📦' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`design-subtab ${activeSubTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveSubTab(tab.id)}
          >
            <span className="design-subtab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {activeSubTab === 'layouts' && renderLayoutsTab()}
      {activeSubTab === 'decor' && renderDecorTab()}
      {activeSubTab === 'moodboard' && renderMoodBoardTab()}
      {activeSubTab === 'rentals' && renderRentalsTab()}
    </div>
  );
};

export default DesignLayoutTab;
