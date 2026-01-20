import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  fetchWeddingVision,
  updateWeddingVision,
  uploadMoodBoardImage,
  deleteMoodBoardImage,
  isValidUrl,
  isValidHexColor,
  type WeddingVision,
  type StyleQuizResult,
} from '../../../api/weddingVisionApi';
import { browserSupabaseClient } from '../../../browserSupabaseClient';
import { useToast } from '../../../components/ui/toast';
import { Heart, Building2, Wheat, Flower2, Crown, Factory } from 'lucide-react';
import './vision.css';

interface VisionStyleTabProps {
  eventId: string;
}

// Style options with icons
const STYLE_OPTIONS: { id: StyleQuizResult; label: string; Icon: React.FC<{ size?: number }> }[] = [
  { id: 'romantic', label: 'Romantic', Icon: Heart },
  { id: 'modern', label: 'Modern', Icon: Building2 },
  { id: 'rustic', label: 'Rustic', Icon: Wheat },
  { id: 'bohemian', label: 'Bohemian', Icon: Flower2 },
  { id: 'classic', label: 'Classic', Icon: Crown },
  { id: 'industrial', label: 'Industrial', Icon: Factory },
];

const VisionStyleTab: React.FC<VisionStyleTabProps> = ({ eventId }) => {
  // State
  const [vision, setVision] = useState<WeddingVision | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [colorPickerOpen, setColorPickerOpen] = useState<number | null>(null);
  const [uploadingImages, setUploadingImages] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Form inputs
  const [keywordInput, setKeywordInput] = useState('');
  const [linkInput, setLinkInput] = useState('');

  // Refs
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const colorPopoverRef = useRef<HTMLDivElement>(null);

  const { showToast } = useToast();

  // Load vision data
  const loadVision = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await fetchWeddingVision(eventId);
    if (err) {
      setError(err);
    } else if (data) {
      setVision(data);
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    loadVision();
  }, [loadVision]);

  // Real-time subscription
  useEffect(() => {
    if (!eventId || !browserSupabaseClient) return;

    const channel = browserSupabaseClient
      .channel(`vision-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wedding_vision',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          // Refetch on any change (from other clients)
          loadVision();
        }
      )
      .subscribe();

    return () => {
      browserSupabaseClient?.removeChannel(channel);
    };
  }, [eventId, loadVision]);

  // Click outside to close color popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorPopoverRef.current && !colorPopoverRef.current.contains(e.target as Node)) {
        setColorPickerOpen(null);
      }
    };

    if (colorPickerOpen !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [colorPickerOpen]);

  // Debounced save function
  const debouncedSave = useCallback(
    (field: keyof WeddingVision, value: any) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      setSaving(true);
      saveTimeoutRef.current = setTimeout(async () => {
        const { error: err } = await updateWeddingVision(eventId, { [field]: value });
        if (err) {
          showToast(`Failed to save: ${err}`, 'error');
        }
        setSaving(false);
      }, 1000);
    },
    [eventId, showToast]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // ========== Style Quiz Handlers ==========
  const handleStyleSelect = (styleId: StyleQuizResult) => {
    if (!vision) return;
    const newValue = vision.style_quiz_result === styleId ? null : styleId;
    setVision({ ...vision, style_quiz_result: newValue });
    debouncedSave('style_quiz_result', newValue);
  };

  // ========== Color Palette Handlers ==========
  const handleAddColor = () => {
    if (!vision || vision.color_palette.length >= 6) return;
    const newColors = [...vision.color_palette, '#6366f1'];
    setVision({ ...vision, color_palette: newColors });
    debouncedSave('color_palette', newColors);
    setColorPickerOpen(newColors.length - 1);
  };

  const handleColorChange = (index: number, color: string) => {
    if (!vision) return;
    const newColors = [...vision.color_palette];
    newColors[index] = color;
    setVision({ ...vision, color_palette: newColors });
    debouncedSave('color_palette', newColors);
  };

  const handleRemoveColor = (index: number) => {
    if (!vision) return;
    const newColors = vision.color_palette.filter((_, i) => i !== index);
    setVision({ ...vision, color_palette: newColors });
    debouncedSave('color_palette', newColors);
    setColorPickerOpen(null);
  };

  // ========== Keywords Handlers ==========
  const handleAddKeyword = (keyword: string) => {
    if (!vision || vision.keywords.length >= 15) return;
    const trimmed = keyword.trim();
    if (!trimmed || vision.keywords.includes(trimmed)) return;
    const newKeywords = [...vision.keywords, trimmed];
    setVision({ ...vision, keywords: newKeywords });
    debouncedSave('keywords', newKeywords);
  };

  const handleRemoveKeyword = (index: number) => {
    if (!vision) return;
    const newKeywords = vision.keywords.filter((_, i) => i !== index);
    setVision({ ...vision, keywords: newKeywords });
    debouncedSave('keywords', newKeywords);
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && keywordInput.trim()) {
      e.preventDefault();
      handleAddKeyword(keywordInput);
      setKeywordInput('');
    }
  };

  // ========== Must-Haves Handlers ==========
  const handleAddMustHave = () => {
    if (!vision) return;
    const newMustHaves = [...vision.must_haves, ''];
    setVision({ ...vision, must_haves: newMustHaves });
  };

  const handleMustHaveChange = (index: number, value: string) => {
    if (!vision) return;
    const newMustHaves = [...vision.must_haves];
    newMustHaves[index] = value;
    setVision({ ...vision, must_haves: newMustHaves });
  };

  const handleMustHaveBlur = () => {
    if (!vision) return;
    // Remove empty items and save
    const filtered = vision.must_haves.filter((item) => item.trim());
    setVision({ ...vision, must_haves: filtered });
    debouncedSave('must_haves', filtered);
  };

  const handleRemoveMustHave = (index: number) => {
    if (!vision) return;
    const newMustHaves = vision.must_haves.filter((_, i) => i !== index);
    setVision({ ...vision, must_haves: newMustHaves });
    debouncedSave('must_haves', newMustHaves);
  };

  // ========== Inspiration Links Handlers ==========
  const handleAddLink = () => {
    if (!vision || !linkInput.trim()) return;
    const url = linkInput.trim();
    if (!isValidUrl(url)) {
      showToast('Please enter a valid URL (http:// or https://)', 'error');
      return;
    }
    if (vision.inspiration_links.includes(url)) {
      showToast('This link is already added', 'error');
      return;
    }
    const newLinks = [...vision.inspiration_links, url];
    setVision({ ...vision, inspiration_links: newLinks });
    debouncedSave('inspiration_links', newLinks);
    setLinkInput('');
  };

  const handleRemoveLink = (index: number) => {
    if (!vision) return;
    const newLinks = vision.inspiration_links.filter((_, i) => i !== index);
    setVision({ ...vision, inspiration_links: newLinks });
    debouncedSave('inspiration_links', newLinks);
  };

  const getHostname = (url: string): string => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  // ========== Mood Board Handlers ==========
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !vision) return;
    await uploadImages(Array.from(files));
    e.target.value = ''; // Reset input
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    if (files.length > 0 && vision) {
      await uploadImages(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const uploadImages = async (files: File[]) => {
    if (!vision) return;

    const remaining = 20 - vision.mood_board_images.length;
    const toUpload = files.slice(0, remaining);

    if (toUpload.length === 0) {
      showToast('Maximum 20 images allowed', 'error');
      return;
    }

    for (const file of toUpload) {
      const tempId = `uploading-${Date.now()}-${Math.random()}`;
      setUploadingImages((prev) => [...prev, tempId]);

      const { data: url, error: err } = await uploadMoodBoardImage(eventId, file);

      setUploadingImages((prev) => prev.filter((id) => id !== tempId));

      if (err) {
        showToast(`Failed to upload ${file.name}: ${err}`, 'error');
      } else if (url) {
        setVision((prev) => {
          if (!prev) return prev;
          const newImages = [...prev.mood_board_images, url];
          debouncedSave('mood_board_images', newImages);
          return { ...prev, mood_board_images: newImages };
        });
      }
    }
  };

  const handleDeleteImage = async (imageUrl: string) => {
    if (!vision) return;

    // Optimistically remove from UI
    const newImages = vision.mood_board_images.filter((url) => url !== imageUrl);
    setVision({ ...vision, mood_board_images: newImages });

    // Delete from storage
    const { error: deleteErr } = await deleteMoodBoardImage(eventId, imageUrl);
    if (deleteErr) {
      showToast(`Failed to delete image: ${deleteErr}`, 'error');
      // Revert on error
      setVision({ ...vision, mood_board_images: vision.mood_board_images });
      return;
    }

    // Save to database
    debouncedSave('mood_board_images', newImages);
  };

  // ========== Render ==========
  if (loading) {
    return (
      <div className="vision-tab-loading">
        <div className="vision-saving-spinner" style={{ width: 24, height: 24 }} />
        <span style={{ marginLeft: 12 }}>Loading vision board...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="vision-tab-error">
        <p>Failed to load vision data: {error}</p>
        <button
          onClick={loadVision}
          style={{
            padding: '8px 16px',
            borderRadius: 999,
            border: 'none',
            background: '#0f172a',
            color: '#ffffff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!vision) return null;

  return (
    <div className="vision-tab">
      {/* Style Quiz Section */}
      <div className="vision-section">
        <div className="vision-section-header">
          <h3 className="vision-section-title">Style Preference</h3>
          {saving && (
            <div className="vision-saving-indicator">
              <div className="vision-saving-spinner" />
              <span>Saving...</span>
            </div>
          )}
        </div>
        <p className="vision-section-hint">Select the style that best describes the vision</p>
        <div className="style-pills">
          {STYLE_OPTIONS.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`style-pill ${vision.style_quiz_result === id ? 'active' : ''}`}
              onClick={() => handleStyleSelect(id)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Color Palette Section */}
      <div className="vision-section">
        <h3 className="vision-section-title">Color Palette</h3>
        <p className="vision-section-hint">Select up to 6 colors for the wedding theme</p>
        <div className="color-palette-row">
          {vision.color_palette.map((hex, index) => (
            <div key={index} className="color-swatch-wrapper" ref={colorPickerOpen === index ? colorPopoverRef : null}>
              <button
                className="color-swatch"
                style={{ backgroundColor: hex }}
                onClick={() => setColorPickerOpen(colorPickerOpen === index ? null : index)}
                aria-label={`Edit color ${hex}`}
              />
              <div className="color-hex">{hex}</div>
              {colorPickerOpen === index && (
                <div className="color-popover">
                  <input
                    type="color"
                    value={hex}
                    onChange={(e) => handleColorChange(index, e.target.value)}
                    aria-label="Choose color"
                  />
                  <div className="color-popover-actions">
                    <button className="color-popover-btn remove" onClick={() => handleRemoveColor(index)}>
                      Remove
                    </button>
                    <button className="color-popover-btn done" onClick={() => setColorPickerOpen(null)}>
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {vision.color_palette.length < 6 && (
            <button className="color-swatch add" onClick={handleAddColor} aria-label="Add color">
              +
            </button>
          )}
        </div>
      </div>

      {/* Keywords Section */}
      <div className="vision-section">
        <h3 className="vision-section-title">Keywords & Themes</h3>
        <p className="vision-section-hint">Add up to 15 keywords (press Enter or comma to add)</p>
        <div className="keywords-input-wrapper">
          <input
            type="text"
            className="keywords-input"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={handleKeywordKeyDown}
            placeholder="e.g., garden party, black tie, bohemian..."
            disabled={vision.keywords.length >= 15}
          />
        </div>
        {vision.keywords.length > 0 && (
          <div className="keywords-list">
            {vision.keywords.map((keyword, index) => (
              <span key={index} className="keyword-tag">
                {keyword}
                <button onClick={() => handleRemoveKeyword(index)} aria-label={`Remove ${keyword}`}>
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Must-Haves Section */}
      <div className="vision-section">
        <h3 className="vision-section-title">Must-Haves</h3>
        <p className="vision-section-hint">The couple's non-negotiables for their special day</p>
        {vision.must_haves.length > 0 && (
          <ul className="must-haves-list">
            {vision.must_haves.map((item, index) => (
              <li key={index} className="must-have-item">
                <span className="must-have-bullet">•</span>
                <input
                  type="text"
                  className="must-have-input"
                  value={item}
                  onChange={(e) => handleMustHaveChange(index, e.target.value)}
                  onBlur={handleMustHaveBlur}
                  placeholder="Enter a must-have..."
                />
                <button className="must-have-delete" onClick={() => handleRemoveMustHave(index)} aria-label="Delete item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
        <button className="add-item-btn" onClick={handleAddMustHave}>
          + Add must-have
        </button>
      </div>

      {/* Inspiration Links Section */}
      <div className="vision-section">
        <h3 className="vision-section-title">Inspiration Links</h3>
        <p className="vision-section-hint">Pinterest boards, Instagram saves, or venue inspiration</p>
        <div className="link-input-row">
          <input
            type="url"
            className="link-input"
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
            placeholder="https://pinterest.com/..."
          />
          <button className="link-add-btn" onClick={handleAddLink} disabled={!linkInput.trim()}>
            Add
          </button>
        </div>
        {vision.inspiration_links.length > 0 ? (
          <div className="inspiration-links-list">
            {vision.inspiration_links.map((url, index) => (
              <div key={index} className="link-card">
                <div className="link-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                  </svg>
                </div>
                <a href={url} target="_blank" rel="noopener noreferrer" className="link-url" title={url}>
                  {getHostname(url)}
                </a>
                <button
                  className="link-external"
                  onClick={() => window.open(url, '_blank')}
                  aria-label="Open link in new tab"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                  </svg>
                </button>
                <button className="link-delete" onClick={() => handleRemoveLink(index)} aria-label="Delete link">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="links-empty">Add Pinterest boards, Instagram saves, or venue inspiration links</div>
        )}
      </div>

      {/* Mood Board Section */}
      <div className="vision-section">
        <h3 className="vision-section-title">Mood Board</h3>
        <p className="vision-section-hint">
          Upload inspiration photos (max 20 images, 5MB each)
          {vision.mood_board_images.length > 0 && ` — ${vision.mood_board_images.length}/20`}
        </p>

        <div
          className={`mood-board-upload-zone ${isDragging ? 'dragging' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} />
          <div className="upload-zone-content">
            <div className="upload-zone-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
            </div>
            <div className="upload-zone-text">Drag images here or click to upload</div>
            <div className="upload-zone-hint">JPG, PNG, WebP (max 5MB)</div>
          </div>
        </div>

        {uploadingImages.length > 0 && (
          <div className="mood-board-uploading">
            <div className="mood-board-uploading-spinner" />
            <span className="mood-board-uploading-text">Uploading {uploadingImages.length} image(s)...</span>
          </div>
        )}

        {vision.mood_board_images.length > 0 ? (
          <div className="mood-board-grid">
            {vision.mood_board_images.map((url, index) => (
              <div key={url} className="mood-board-item" onClick={() => setLightboxImage(url)}>
                <img src={url} alt={`Mood board ${index + 1}`} loading="lazy" />
                <div className="mood-board-overlay">
                  <button
                    className="mood-board-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteImage(url);
                    }}
                    aria-label="Delete image"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          uploadingImages.length === 0 && <div className="mood-board-empty">No images yet. Upload some inspiration!</div>
        )}
      </div>

      {/* AI Placeholder Section */}
      <div className="vision-section">
        <div className="ai-placeholder-box">
          <div className="ai-placeholder-icon">✨</div>
          <h4 className="ai-placeholder-title">AI Vision Assistant (Coming Soon)</h4>
          <p className="ai-placeholder-desc">
            Get personalized vendor suggestions and style recommendations based on your mood board
          </p>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <div className="lightbox-backdrop" onClick={() => setLightboxImage(null)}>
          <button className="lightbox-close" onClick={() => setLightboxImage(null)}>
            ×
          </button>
          <img src={lightboxImage} alt="Full size preview" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
};

export default VisionStyleTab;
