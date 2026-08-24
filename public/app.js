// DOM Elements
const form = document.getElementById('campaign-form');
const tbody = document.getElementById('campaigns-tbody');
const formError = document.getElementById('form-error');
const btnSubmit = document.getElementById('btn-submit');
const btnRefresh = document.getElementById('btn-refresh');

const mediaIdInput = document.getElementById('mediaId');
const selectedMediaPreview = document.getElementById('selected-media-preview');
const previewImg = document.getElementById('preview-img');
const previewCaption = document.getElementById('preview-caption');
const btnClearMedia = document.getElementById('btn-clear-media');

const modal = document.getElementById('media-modal');
const modalBackdrop = document.getElementById('modal-backdrop');
const btnOpenPicker = document.getElementById('btn-open-picker');
const btnCloseModal = document.getElementById('btn-close-modal');
const mediaGridContainer = document.getElementById('media-grid-container');
const mediaGrid = document.getElementById('media-grid');
const mediaLoading = document.getElementById('media-loading');
const mediaError = document.getElementById('media-error');

// State
let campaigns = [];
let mediaList = [];
let isMediaLoaded = false;
let currentSelectedMedia = null;

// Initial Load
fetchCampaigns();

// Event Listeners
form.addEventListener('submit', handleFormSubmit);
btnRefresh.addEventListener('click', fetchCampaigns);
btnClearMedia.addEventListener('click', clearMediaSelection);

// Modal Event Listeners
btnOpenPicker.addEventListener('click', openModal);
btnCloseModal.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', closeModal);

// --- API Calls ---

async function fetchCampaigns() {
  btnRefresh.classList.add('animate-spin');
  try {
    const res = await fetch('/api/campaigns');
    if (!res.ok) throw new Error('Failed to fetch campaigns');
    campaigns = await res.json();
    renderCampaigns();
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-sm text-red-500">Error loading campaigns.</td></tr>`;
  } finally {
    btnRefresh.classList.remove('animate-spin');
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();
  formError.classList.add('hidden');
  btnSubmit.disabled = true;
  btnSubmit.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving...';

  const keyword = document.getElementById('keyword').value;
  const replyMessage = document.getElementById('replyMessage').value;
  const mediaId = currentSelectedMedia ? currentSelectedMedia.id : null;

  try {
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword, replyMessage, mediaId })
    });

    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.error || 'Failed to save campaign');
    }

    // Success
    form.reset();
    clearMediaSelection();
    fetchCampaigns(); // refresh list
  } catch (error) {
    formError.textContent = error.message;
    formError.classList.remove('hidden');
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = 'Save Campaign';
  }
}

async function deleteCampaign(id) {
  if (!confirm('Are you sure you want to delete this campaign?')) return;
  
  try {
    const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete');
    fetchCampaigns();
  } catch (error) {
    alert(error.message);
  }
}

// --- Render Logic ---

function renderCampaigns() {
  if (campaigns.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-12 text-center text-sm font-medium text-slate-500 bg-slate-50/30">No active campaigns found. Add one on the left!</td></tr>`;
    return;
  }

  tbody.innerHTML = '';
  campaigns.forEach(c => {
    const isGlobal = !c.mediaId;
    const targetBadge = isGlobal 
      ? `<span class="px-3 py-1 inline-flex text-[11px] leading-5 font-bold rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">Global (All)</span>`
      : `<span class="px-3 py-1 inline-flex text-[11px] leading-5 font-bold rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200" title="ID: ${c.mediaId}">Specific Post</span>`;

    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50/80 transition-colors";
    tr.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm font-bold text-slate-900 bg-slate-100/50 inline-block px-2 py-1 rounded-md border border-slate-200/50">${c.keyword}</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        ${targetBadge}
      </td>
      <td class="px-6 py-4">
        <div class="text-sm text-slate-600 max-w-[200px] xl:max-w-xs truncate font-medium" title="${c.replyMessage}">${c.replyMessage}</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button onclick="deleteCampaign('${c.id}')" class="text-slate-400 hover:text-red-600 transition-colors bg-white hover:bg-red-50 p-2 rounded-lg border border-transparent hover:border-red-100">
          <i class="fa-regular fa-trash-can"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// --- Media Picker Logic ---

function openModal() {
  modal.classList.remove('hidden');
  if (!isMediaLoaded) {
    loadInstagramMedia();
  }
}

function closeModal() {
  modal.classList.add('hidden');
}

async function loadInstagramMedia() {
  mediaLoading.classList.remove('hidden');
  mediaGridContainer.classList.add('hidden');
  mediaError.classList.add('hidden');

  try {
    const res = await fetch('/api/media');
    const data = await res.json();
    
    if (!res.ok) throw new Error(data.error || 'Failed to load media');
    
    mediaList = data;
    renderMediaGrid();
    isMediaLoaded = true;
    mediaLoading.classList.add('hidden');
    mediaGridContainer.classList.remove('hidden');
  } catch (error) {
    mediaLoading.classList.add('hidden');
    mediaError.textContent = error.message;
    mediaError.classList.remove('hidden');
  }
}

function renderMediaGrid() {
  mediaGrid.innerHTML = '';
  
  if (mediaList.length === 0) {
    mediaGrid.innerHTML = `<div class="col-span-full text-center py-12 text-slate-500 font-medium">No Instagram posts found.</div>`;
    return;
  }

  mediaList.forEach(media => {
    // Determine image URL (thumbnail for video, media_url for image/carousel)
    const imgUrl = media.thumbnail_url || media.media_url || 'https://via.placeholder.com/300?text=No+Image';
    const typeIcon = media.media_type === 'VIDEO' ? '<div class="absolute top-2 right-2 bg-black/40 backdrop-blur-md rounded-full p-1.5 shadow-sm"><i class="fa-solid fa-play text-white text-xs px-0.5"></i></div>' : '';
    const caption = media.caption ? media.caption.substring(0, 70) + '...' : 'No caption';
    const formattedDate = new Date(media.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const div = document.createElement('div');
    div.className = "relative group rounded-xl overflow-hidden border border-slate-200 cursor-pointer hover:ring-2 hover:ring-indigo-500 hover:shadow-xl transition-all bg-white transform hover:-translate-y-1";
    div.onclick = () => selectMedia(media, imgUrl);
    
    div.innerHTML = `
      <div class="aspect-w-1 aspect-h-1 w-full relative">
        <img src="${imgUrl}" alt="Instagram Post" class="w-full h-48 object-cover">
        ${typeIcon}
        <div class="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
          <span class="text-white font-bold text-center w-full bg-indigo-600/90 backdrop-blur-sm py-2 rounded-lg shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all">Select Reel</span>
        </div>
      </div>
      <div class="p-3 bg-white">
        <p class="text-xs text-slate-600 line-clamp-2 leading-relaxed font-medium" title="${media.caption}">${caption}</p>
        <p class="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wider">${formattedDate}</p>
      </div>
    `;
    mediaGrid.appendChild(div);
  });
}

function selectMedia(media, imgUrl) {
  currentSelectedMedia = media;
  
  // Update UI
  mediaIdInput.value = media.id;
  previewImg.src = imgUrl;
  previewCaption.textContent = media.caption || 'No caption';
  
  selectedMediaPreview.classList.remove('hidden');
  
  closeModal();
}

function clearMediaSelection() {
  currentSelectedMedia = null;
  mediaIdInput.value = '';
  selectedMediaPreview.classList.add('hidden');
}
