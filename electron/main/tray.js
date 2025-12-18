import { Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Create system tray icon
 * @param {BrowserWindow} mainWindow - The main application window
 * @returns {Tray} The created tray instance
 */
export function createTray(mainWindow) {
  // Create a simple icon (you'll want to replace this with an actual icon file)
  // For now, we'll create a minimal template icon
  const icon = nativeImage.createEmpty();

  const tray = new Tray(icon);
  tray.setToolTip('Momentum');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Momentum',
      click: () => {
        mainWindow.show();
      }
    },
    {
      label: 'Dashboard',
      click: () => {
        mainWindow.show();
        mainWindow.webContents.send('navigate', 'dashboard');
      }
    },
    { type: 'separator' },
    {
      label: 'Quick Actions',
      submenu: [
        {
          label: 'View Status',
          click: () => {
            mainWindow.show();
            mainWindow.webContents.send('quick-action', 'status');
          }
        },
        {
          label: 'View Roadmap',
          click: () => {
            mainWindow.show();
            mainWindow.webContents.send('navigate', 'roadmap');
          }
        }
      ]
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        mainWindow.destroy();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  // Show window on tray icon click
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });

  return tray;
}
