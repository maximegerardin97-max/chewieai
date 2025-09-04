# 🎨 Image Canvas - ShadCN Style

A beautiful, modern image canvas built with ShadCN design principles and Tailwind CSS. Upload images and drag them around to create your perfect layout.

## ✨ Features

- **🎯 ShadCN Design System** - Modern, accessible UI components
- **📱 Responsive Design** - Works perfectly on all devices
- **🖼️ Drag & Drop** - Intuitive image positioning
- **📁 Multiple Upload** - Upload several images at once
- **🗑️ Smart Deletion** - Hover to delete individual images
- **🧹 Bulk Clear** - Remove all images with confirmation
- **⌨️ Keyboard Support** - Delete key to remove selected images
- **🎭 Smooth Animations** - Beautiful entrance/exit effects
- **🌙 Dark Mode Ready** - Built-in dark mode support

## 🚀 Quick Start

1. **Open the project** in your browser:
   ```bash
   open index.html
   ```

2. **Upload images** by clicking the "Upload Images" button

3. **Drag images** around the canvas to position them

4. **Delete images** by hovering and clicking the × button

5. **Clear all** using the "Clear All" button

## 🛠️ Technical Details

### Built With
- **HTML5** - Semantic markup
- **Tailwind CSS** - Utility-first CSS framework
- **ShadCN Design System** - Component design tokens
- **Vanilla JavaScript** - No framework dependencies

### File Structure
```
├── index.html          # Main HTML structure
├── styles.css          # Tailwind + ShadCN styles
├── script.js           # Canvas functionality
├── tailwind.config.js  # Tailwind configuration
├── postcss.config.js   # PostCSS configuration
└── package.json        # Dependencies
```

### Key Components
- **ImageCanvas Class** - Main canvas functionality
- **Drag & Drop System** - Mouse and touch support
- **Image Management** - Upload, position, delete
- **Responsive Layout** - Mobile-first design

## 🎨 Customization

### Colors
The app uses CSS custom properties for easy theming:
```css
:root {
  --primary: 221.2 83.2% 53.3%;
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  /* ... more colors */
}
```

### Canvas Size
Modify the canvas height in `styles.css`:
```css
.canvas {
  @apply h-[600px]; /* Change this value */
}
```

### Image Limits
Adjust maximum image dimensions:
```css
.draggable-image {
  @apply max-w-[200px] max-h-[200px]; /* Modify these values */
}
```

## 📱 Browser Support

- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile browsers

## 🔧 Development

### Prerequisites
- Node.js (for Tailwind processing)

### Setup
```bash
npm install
```

### Build CSS (if needed)
```bash
npx tailwindcss -i styles.css -o output.css --watch
```

## 🎯 Future Enhancements

- [ ] Image resizing
- [ ] Image rotation
- [ ] Layer management
- [ ] Export functionality
- [ ] Undo/redo system
- [ ] Image filters
- [ ] Collaboration features

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

---

**Made with ❤️ using ShadCN design principles**
