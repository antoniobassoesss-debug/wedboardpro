# Modal Design Guidelines

Based on the SatellitePickerModal UI, here are the design standards for all modals in the application.

## Overall Container

```javascript
{
  position: 'fixed',
  inset: 0,
  zIndex: 20000,
  background: 'rgba(0,0,0,0.55)',           // Semi-transparent dark overlay
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  fontFamily: "'Geist', 'Inter', sans-serif",
}

// Inner card
{
  width: '100%',
  maxWidth: 1100,                           // Or appropriate max-width for content
  height: '85vh',
  maxHeight: 820,
  background: '#ffffff',
  borderRadius: 20,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
  border: '1px solid rgba(0,0,0,0.08)',
}
```

## Header Section

```javascript
{
  padding: '18px 24px',
  borderBottom: '1px solid #f3f4f6',
  background: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexShrink: 0,
}

// Icon container (40x40px, rounded 10px)
{
  width: 40,
  height: 40,
  borderRadius: 10,
  background: '#f1f5f9',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

// Title
{
  margin: 0,
  fontSize: 17,
  fontWeight: 700,
  color: '#0f172a',     // Dark slate
}

// Subtitle/Description
{
  margin: '2px 0 0',
  fontSize: 12,
  color: '#64748b',     // Muted slate
}
```

## Step Indicator / Tabs

```javascript
// Active step
{
  padding: '6px 14px',
  borderRadius: 8,
  background: '#0f172a',    // Primary dark
  color: '#fff',
  fontSize: 13,
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
}

// Inactive step
{
  background: 'transparent',
  color: '#cbd5e1',
  fontWeight: 500,
}

// Completed step
{
  color: '#22c55e',    // Green checkmark
}

// Divider between steps
{
  color: '#e2e8f0',
  fontSize: 14,
  margin: '0 4px',
}
```

## Close Button

```javascript
{
  width: 36,
  height: 36,
  borderRadius: 8,
  border: 'none',
  background: '#f1f5f9',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#64748b',
  transition: 'background 0.15s',
}

// Hover state
onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
```

## Primary Button

```javascript
{
  padding: '12px 16px',         // Or '13px 16px' for larger CTAs
  borderRadius: 10,             // 10-12px radius
  border: 'none',
  background: '#0f172a',        // Dark slate primary
  color: '#fff',
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
  fontFamily: "'Geist', 'Inter', sans-serif",
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
}

// Disabled state
{
  background: '#9ca3af',        // Gray when disabled
  cursor: 'not-allowed',
}
```

## Secondary Button

```javascript
{
  padding: '10px 16px',
  borderRadius: 10,
  border: '1px solid #e5e7eb',  // Light border
  background: '#ffffff',
  color: '#374151',               // Dark gray text
  fontWeight: 500,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: "'Geist', 'Inter', sans-serif",
}
```

## Input Fields

```javascript
{
  width: '100%',
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid #e5e7eb',
  background: '#ffffff',
  color: '#1f2937',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: "'Geist', 'Inter', sans-serif",
}

// Focus state
{
  borderColor: '#0f172a',
  boxShadow: '0 0 0 3px rgba(15, 23, 42, 0.1)',
}
```

## Side Panel (for modals with split view)

```javascript
{
  width: 280-320,              // 280-300px typical
  flexShrink: 0,
  borderLeft: '1px solid #f1f5f9',
  background: '#ffffff',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}

// Panel header
{
  padding: '16px 20px',
  borderBottom: '1px solid #f1f5f9',
}

// Panel content
{
  flex: 1,
  padding: '16px 20px',
  overflowY: 'auto',
}
```

## Form Labels

```javascript
{
  display: 'block',
  color: '#374151',
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
  fontFamily: "'Geist', 'Inter', sans-serif",
}
```

## Dropzone / Upload Area

```javascript
{
  border: '2px dashed #e2e8f0',           // Light dashed border
  borderRadius: 16,
  background: '#fafafa',
  padding: '56px 40px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 16,
  cursor: 'pointer',
  transition: 'all 0.2s',
}

// Drag over state
{
  borderColor: '#0f172a',
  background: '#f8fafc',
}
```

## Summary / Info Boxes

```javascript
{
  background: '#f8fafc',
  padding: '16px',
  borderRadius: 10,
}

// Row in summary
{
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 13,
}

.label {
  color: '#64748b',
}

.value {
  fontWeight: 600,
  color: '#0f172a',
}
```

## Color Palette Summary

| Element | Color |
|---------|-------|
| Primary background | `#0f172a` (dark slate) |
| Secondary background | `#f1f5f9` (light slate) |
| Primary text | `#0f172a` |
| Secondary text | `#64748b` |
| Muted text | `#94a3b8` |
| Border | `#e2e8f0` or `#e5e7eb` |
| Success | `#22c55e` (green) |
| Warning | `#f59e0b` (amber) |
| Error | `#ef4444` (red) |
| White | `#ffffff` |

## Icons

- Use `lucide-react` icons when available
- Icon size: 16-20px for small, 24-28px for large
- Stroke width: 1.5-2
- Icon color: match the surrounding text color

## Typography

- Font family: `'Geist', 'Inter', sans-serif`
- Headings: 16-18px, weight 600-700
- Body: 13-14px, weight 400-500
- Small/caption: 11-12px, weight 400-500

## Animation & Transitions

- Button hover: `transition: 'background 0.15s'`
- Drag states: `transition: 'all 0.2s'`
- Modal entrance: Optional slide-up animation for mobile
- Spinners: Simple CSS spin animation for loading states

## Responsive Notes

- On mobile: Consider bottom sheet style with `maxHeight: '90vh'`
- Use `isMobile` check to adjust padding and border radius
- Touch-friendly button sizes (min 44px height)
