import { AdWithAnalysis } from '@/types/ad';
import JSZip from 'jszip';

/**
 * Download utility to save ad content for offline viewing
 */

/**
 * Download a file from a URL
 */
async function downloadFile(url: string, filename: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download ${filename}`);
  return response.blob();
}

/**
 * Sanitize filename to remove invalid characters
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase()
    .substring(0, 50);
}

/**
 * Create an HTML file with ad content for offline viewing
 */
function createAdHTML(ad: AdWithAnalysis, imageFiles: string[], videoFiles: string[]): string {
  const title = ad.main_title || ad.ad_copy || 'Ad Content';
  const body = ad.main_body_text || '';
  const caption = ad.main_caption || '';
  const competitor = ad.competitor?.name || 'Unknown';
  const score = ad.analysis?.overall_score?.toFixed(1) || 'N/A';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #0a0a0a;
            color: #e0e0e0;
        }
        .container {
            background: #1a1a1a;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        }
        .header {
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            margin: 0 0 10px 0;
            color: #fff;
            font-size: 28px;
        }
        .meta {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
            color: #999;
            font-size: 14px;
        }
        .meta-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .score {
            background: #22c55e;
            color: #000;
            padding: 4px 12px;
            border-radius: 6px;
            font-weight: bold;
        }
        .content-section {
            margin: 30px 0;
        }
        .content-section h2 {
            color: #fff;
            font-size: 20px;
            margin-bottom: 15px;
            border-left: 4px solid #3b82f6;
            padding-left: 12px;
        }
        .text-content {
            background: #222;
            padding: 20px;
            border-radius: 8px;
            line-height: 1.6;
            white-space: pre-wrap;
        }
        .media-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .media-item {
            background: #222;
            border-radius: 8px;
            overflow: hidden;
        }
        .media-item img,
        .media-item video {
            width: 100%;
            height: auto;
            display: block;
        }
        .media-caption {
            padding: 10px;
            font-size: 12px;
            color: #999;
        }
        .download-info {
            background: #2563eb;
            color: white;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .cta {
            background: #333;
            padding: 15px 20px;
            border-radius: 8px;
            margin-top: 20px;
            border-left: 4px solid #f59e0b;
        }
        .cta strong {
            color: #f59e0b;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="download-info">
            <strong>✓ Saved for Offline Viewing</strong><br>
            This ad has been downloaded and can be viewed without an internet connection.
            <br><small>Saved on: ${new Date().toLocaleString()}</small>
        </div>
        
        <div class="header">
            <h1>${title}</h1>
            <div class="meta">
                <div class="meta-item">
                    <strong>Competitor:</strong> ${competitor}
                </div>
                <div class="meta-item">
                    <strong>Ad ID:</strong> ${ad.id}
                </div>
                <div class="meta-item">
                    <strong>Archive ID:</strong> ${ad.ad_archive_id}
                </div>
                ${ad.analysis?.overall_score ? `
                <div class="meta-item">
                    <span class="score">Score: ${score}</span>
                </div>
                ` : ''}
            </div>
        </div>

        ${body ? `
        <div class="content-section">
            <h2>Ad Copy</h2>
            <div class="text-content">${body}</div>
        </div>
        ` : ''}

        ${caption ? `
        <div class="content-section">
            <h2>Caption</h2>
            <div class="text-content">${caption}</div>
        </div>
        ` : ''}

        ${ad.cta_text ? `
        <div class="cta">
            <strong>Call to Action:</strong> ${ad.cta_text}
        </div>
        ` : ''}

        ${imageFiles.length > 0 ? `
        <div class="content-section">
            <h2>Images (${imageFiles.length})</h2>
            <div class="media-grid">
                ${imageFiles.map((file, idx) => `
                <div class="media-item">
                    <img src="images/${file}" alt="Ad Image ${idx + 1}">
                    <div class="media-caption">Image ${idx + 1}</div>
                </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        ${videoFiles.length > 0 ? `
        <div class="content-section">
            <h2>Videos (${videoFiles.length})</h2>
            <div class="media-grid">
                ${videoFiles.map((file, idx) => `
                <div class="media-item">
                    <video src="videos/${file}" controls>
                        Your browser does not support the video tag.
                    </video>
                    <div class="media-caption">Video ${idx + 1}</div>
                </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        ${ad.analysis ? `
        <div class="content-section">
            <h2>AI Analysis</h2>
            <div class="text-content">
                ${ad.analysis.summary ? `<p><strong>Summary:</strong> ${ad.analysis.summary}</p>` : ''}
                ${ad.analysis.target_audience ? `<p><strong>Target Audience:</strong> ${ad.analysis.target_audience}</p>` : ''}
                ${ad.analysis.content_themes ? `<p><strong>Themes:</strong> ${ad.analysis.content_themes.join(', ')}</p>` : ''}
                ${ad.analysis.hook_score ? `<p><strong>Hook Score:</strong> ${ad.analysis.hook_score}</p>` : ''}
            </div>
        </div>
        ` : ''}
    </div>
</body>
</html>`;
}

/**
 * Download ad content for offline viewing
 * Creates a ZIP file with images, videos, and HTML file
 */
export async function downloadAdForOffline(ad: AdWithAnalysis): Promise<void> {
  try {
    const zip = new JSZip();
    const imageFiles: string[] = [];
    const videoFiles: string[] = [];

    // Add ad metadata as JSON
    zip.file('ad-data.json', JSON.stringify(ad, null, 2));

    // Download images
    const imageUrls = ad.main_image_urls || [];
    if (imageUrls.length > 0) {
      const imagesFolder = zip.folder('images');
      if (imagesFolder) {
        for (let i = 0; i < imageUrls.length; i++) {
          try {
            const url = imageUrls[i];
            const filename = `image_${i + 1}.jpg`;
            const blob = await downloadFile(url, filename);
            imagesFolder.file(filename, blob);
            imageFiles.push(filename);
          } catch (error) {
            console.error(`Failed to download image ${i + 1}:`, error);
          }
        }
      }
    }

    // Download videos
    const videoUrls = ad.main_video_urls || [];
    if (videoUrls.length > 0) {
      const videosFolder = zip.folder('videos');
      if (videosFolder) {
        for (let i = 0; i < videoUrls.length; i++) {
          try {
            const url = videoUrls[i];
            const filename = `video_${i + 1}.mp4`;
            const blob = await downloadFile(url, filename);
            videosFolder.file(filename, blob);
            videoFiles.push(filename);
          } catch (error) {
            console.error(`Failed to download video ${i + 1}:`, error);
          }
        }
      }
    }

    // Create HTML file for offline viewing
    const htmlContent = createAdHTML(ad, imageFiles, videoFiles);
    zip.file('index.html', htmlContent);

    // Generate ZIP file
    const content = await zip.generateAsync({ type: 'blob' });

    // Download the ZIP file
    const zipFilename = `ad_${sanitizeFilename(ad.competitor?.name || 'unknown')}_${ad.id}_${Date.now()}.zip`;
    const url = window.URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = zipFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return Promise.resolve();
  } catch (error) {
    console.error('Error downloading ad content:', error);
    throw error;
  }
}

/**
 * Quick save - just download the HTML without media (faster)
 */
export async function quickSaveAd(ad: AdWithAnalysis): Promise<void> {
  const htmlContent = createAdHTML(ad, [], []);
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = window.URL.createObjectURL(blob);
  const filename = `ad_${sanitizeFilename(ad.competitor?.name || 'unknown')}_${ad.id}.html`;
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
