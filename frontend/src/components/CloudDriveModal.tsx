import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Cloud, CheckCircle2, Trash2, Loader2, ArrowRight, AlertCircle, FileText, Check, ExternalLink, HelpCircle, Plus, Link2 } from 'lucide-react';
import api from '../services/api';

export interface SelectedCloudFile {
  id: string;
  name: string;
  size?: number;
  downloadUrl?: string;
  source: 'google' | 'onedrive';
}

interface CloudDriveModalProps {
  jobId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (batchId: string, totalFiles: number) => void;
}

export const CloudDriveModal: React.FC<CloudDriveModalProps> = ({
  jobId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'google' | 'onedrive'>('google');
  const [selectedFiles, setSelectedFiles] = useState<SelectedCloudFile[]>([]);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [isIngesting, setIsIngesting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoadingSdk, setIsLoadingSdk] = useState(false);
  const [manualLinkInputs, setManualLinkInputs] = useState<string[]>(['']);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const googlePickerKey = import.meta.env.VITE_GOOGLE_PICKER_API_KEY || '';
  const azureClientId = import.meta.env.VITE_AZURE_CLIENT_ID || '';

  // Load Google Picker script dynamically
  useEffect(() => {
    if (!isOpen) return;

    if (!document.getElementById('google-api-script')) {
      const script = document.createElement('script');
      script.id = 'google-api-script';
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      document.body.appendChild(script);
    }

    if (!document.getElementById('onedrive-picker-script')) {
      const oneDriveScript = document.createElement('script');
      oneDriveScript.id = 'onedrive-picker-script';
      oneDriveScript.src = 'https://js.live.net/v7.2/OneDrive.js';
      oneDriveScript.async = true;
      document.body.appendChild(oneDriveScript);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Google Drive Picker launch
  const handleOpenGooglePicker = () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!googleClientId) {
      setErrorMsg('VITE_GOOGLE_CLIENT_ID is not configured in frontend .env.');
      return;
    }

    setIsLoadingSdk(true);

    const launchPicker = (accessToken: string) => {
      if (!(window as any).gapi) {
        setIsLoadingSdk(false);
        setErrorMsg('Google API SDK not ready. Please refresh and try again.');
        return;
      }

      (window as any).gapi.load('picker', () => {
        try {
          const docsView = new (window as any).google.picker.DocsView(
            (window as any).google.picker.ViewId.DOCS
          )
            .setMimeTypes(
              'application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip'
            )
            .setIncludeFolders(true);

          const appId = googleClientId ? googleClientId.split('-')[0] : '';

          const pickerBuilder = new (window as any).google.picker.PickerBuilder()
            .enableFeature((window as any).google.picker.Feature.MULTISELECT_ENABLED)
            .setOAuthToken(accessToken)
            .addView(docsView)
            .setCallback((data: any) => {
              if (data.action === (window as any).google.picker.Action.PICKED) {
                const picked: SelectedCloudFile[] = (data.docs || []).map((doc: any) => ({
                  id: doc.id,
                  name: doc.name,
                  size: doc.sizeBytes ? Number(doc.sizeBytes) : undefined,
                  source: 'google' as const,
                }));

                setSelectedFiles((prev) => {
                  const existingIds = new Set(prev.map((f) => f.id));
                  const newItems = picked.filter((p) => !existingIds.has(p.id));
                  return [...prev, ...newItems];
                });
                setSuccessMsg(`Added ${picked.length} file(s) from Google Drive.`);
              }
            });

          if (appId) {
            pickerBuilder.setAppId(appId);
          }

          if (googlePickerKey) {
            pickerBuilder.setDeveloperKey(googlePickerKey);
          }

          const picker = pickerBuilder.build();
          picker.setVisible(true);
        } catch (err: any) {
          setErrorMsg(`Failed to launch Google Picker: ${err?.message || err}`);
        } finally {
          setIsLoadingSdk(false);
        }
      });
    };

    if (googleAccessToken) {
      launchPicker(googleAccessToken);
      return;
    }

    // Initialize Token Client
    try {
      const tokenClient = (window as any).google?.accounts?.oauth2?.initTokenClient({
        client_id: googleClientId,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (response: any) => {
          if (response.error) {
            setIsLoadingSdk(false);
            setErrorMsg(`Google Auth Failed: ${response.error_description || response.error}`);
            return;
          }
          setGoogleAccessToken(response.access_token);
          launchPicker(response.access_token);
        },
      });

      if (tokenClient) {
        tokenClient.requestAccessToken({ prompt: '' });
      } else {
        setIsLoadingSdk(false);
        setErrorMsg('Google Identity Services not initialized. Please ensure cookies are allowed.');
      }
    } catch (err: any) {
      setIsLoadingSdk(false);
      setErrorMsg(`Auth initialization failed: ${err?.message || err}`);
    }
  };

  // Handle Microsoft OneDrive Picker launch
  const handleOpenOneDrivePicker = () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!azureClientId) {
      setErrorMsg(
        'VITE_AZURE_CLIENT_ID is not configured in frontend .env. Register an app on portal.azure.com (SPA redirect: your origin) and add the Client ID.'
      );
      return;
    }

    if (!(window as any).OneDrive) {
      setErrorMsg('OneDrive Picker SDK not ready. Please try again in a few seconds.');
      return;
    }

    try {
      (window as any).OneDrive.open({
        clientId: azureClientId,
        action: 'download',
        multiSelect: true,
        advanced: {
          filter: '.pdf,.docx,.zip',
          redirectUri: window.location.origin,
        },
        success: (response: any) => {
          const files: SelectedCloudFile[] = (response.value || []).map((f: any) => ({
            id: f.id,
            name: f.name,
            size: f.size,
            downloadUrl: f['@microsoft.graph.downloadUrl'],
            source: 'onedrive' as const,
          }));

          setSelectedFiles((prev) => {
            const existingIds = new Set(prev.map((f) => f.id));
            const newItems = files.filter((p) => !existingIds.has(p.id));
            return [...prev, ...newItems];
          });
          setSuccessMsg(`Added ${files.length} file(s) from OneDrive.`);
        },
        cancel: () => {},
        error: (err: any) => {
          setErrorMsg(err?.message || 'OneDrive picker error.');
        },
      });
    } catch (err: any) {
      setErrorMsg(`OneDrive Launch Error: ${err?.message || err}`);
    }
  };

  // Manage dynamic manual link inputs with auto-split on paste
  const handleManualLinkChange = (index: number, val: string) => {
    const parts = val.split(/[\n,]/).map((s) => s.trim()).filter((s) => s.length > 0);
    if (parts.length > 1) {
      setManualLinkInputs((prev) => {
        const next = [...prev];
        next.splice(index, 1, ...parts);
        return next;
      });
      return;
    }
    setManualLinkInputs((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const addManualLinkRow = () => {
    setManualLinkInputs((prev) => [...prev, '']);
  };

  const removeManualLinkRow = (index: number) => {
    setManualLinkInputs((prev) => {
      if (prev.length <= 1) return [''];
      return prev.filter((_, i) => i !== index);
    });
  };

  // Add manual cloud links to selection staging
  const handleAddManualLinks = () => {
    const urls = manualLinkInputs
      .map((u) => u.trim())
      .filter((u) => u.length > 5);

    if (urls.length === 0) return;

    const newItems: SelectedCloudFile[] = urls.map((u, i) => {
      const isGdrive = u.includes('drive.google.com') || u.includes('docs.google.com');
      const isOneDrive = u.includes('1drv.ms') || u.includes('sharepoint.com');

      let fileId: string | undefined = undefined;
      const gMatch = u.match(/\/d\/([a-zA-Z0-9_-]+)/) || u.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (gMatch) {
        fileId = gMatch[1];
      }

      const defaultName = fileId ? `Google_Drive_${fileId.slice(0, 8)}.pdf` : `Resume_Link_${Date.now()}_${i + 1}.pdf`;

      return {
        id: fileId || `manual_${Date.now()}_${i}`,
        name: defaultName,
        downloadUrl: u,
        source: isGdrive ? 'google' : (isOneDrive ? 'onedrive' : activeTab),
      };
    });

    setSelectedFiles((prev) => [...prev, ...newItems]);
    setManualLinkInputs(['']);
    setSuccessMsg(`Added ${newItems.length} cloud link(s) to selection. Click "Ingest & Screen" below to process.`);
  };

  // Submit staged files for batch ingestion
  const handleStartIngest = async () => {
    // Automatically merge any valid URLs currently typed into the input boxes
    const pendingUrls = manualLinkInputs
      .map((u) => u.trim())
      .filter((u) => u.length > 5);

    let allFiles = [...selectedFiles];
    if (pendingUrls.length > 0) {
      const extraItems: SelectedCloudFile[] = pendingUrls.map((u, i) => {
        const isGdrive = u.includes('drive.google.com') || u.includes('docs.google.com');
        const isOneDrive = u.includes('1drv.ms') || u.includes('sharepoint.com');
        let fileId: string | undefined = undefined;
        const gMatch = u.match(/\/d\/([a-zA-Z0-9_-]+)/) || u.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (gMatch) fileId = gMatch[1];
        const defaultName = fileId ? `Google_Drive_${fileId.slice(0, 8)}.pdf` : `Resume_Link_${Date.now()}_${i + 1}.pdf`;
        return {
          id: fileId || `manual_${Date.now()}_${i}`,
          name: defaultName,
          downloadUrl: u,
          source: isGdrive ? 'google' : (isOneDrive ? 'onedrive' : activeTab),
        };
      });
      allFiles = [...allFiles, ...extraItems];
    }

    if (allFiles.length === 0) return;

    setIsIngesting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload = {
        files: allFiles.map((f) => ({
          id: f.id.startsWith('manual_') ? undefined : f.id,
          name: f.name,
          download_url: f.downloadUrl,
          source: f.source,
        })),
        google_access_token: googleAccessToken,
      };

      const res = await api.post(`/jobs/${jobId}/import-cloud-storage`, payload);
      onSuccess(res.data.batch_id, res.data.total_files);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || 'Failed to ingest cloud files.');
    } finally {
      setIsIngesting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Cloud Storage Connector</h3>
              <p className="text-[11px] text-slate-500">
                Connect your cloud storage or paste links to import candidate resumes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isIngesting}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50/30">
          <button
            onClick={() => {
              setActiveTab('google');
              setErrorMsg(null);
            }}
            className={`pb-3 pt-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'google'
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Google Drive
          </button>
          <button
            onClick={() => {}}
            disabled
            className={`pb-3 pt-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all opacity-60 cursor-not-allowed border-transparent text-slate-500`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Microsoft OneDrive <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full ml-1">Soon</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex items-start gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Google Tab */}
          {activeTab === 'google' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src="https://www.gstatic.com/images/branding/product/1x/drive_2020q4_48dp.png"
                      alt="Google Drive"
                      className="w-5 h-5 object-contain"
                    />
                    <span className="text-xs font-bold text-slate-800">Google Drive Integration</span>
                  </div>
                  {googleAccessToken && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <Check className="w-3 h-3" /> Connected
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Sign in with your Google account to open the native Drive picker and select resumes or batches.
                </p>

                <button
                  type="button"
                  onClick={handleOpenGooglePicker}
                  disabled={isLoadingSdk || isIngesting}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:border-brand-500 bg-white hover:bg-brand-50/30 text-slate-800 font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
                >
                  {isLoadingSdk ? (
                    <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
                  ) : (
                    <img
                      src="https://www.gstatic.com/images/branding/product/1x/drive_2020q4_48dp.png"
                      alt="Drive"
                      className="w-4 h-4"
                    />
                  )}
                  Browse & Select from Google Drive
                </button>
              </div>

              {/* Dynamic Google Drive shared link inputs */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-brand-600" />
                    <span>Paste Google Drive Shared Links</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    &quot;Anyone with the link can view&quot;
                  </span>
                </div>

                <div className="space-y-2">
                  {manualLinkInputs.map((link, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="url"
                          value={link}
                          onChange={(e) => handleManualLinkChange(idx, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addManualLinkRow();
                            }
                          }}
                          placeholder="https://drive.google.com/file/d/1ABCxyz/view?usp=sharing"
                          className="field w-full text-xs font-mono py-2"
                          disabled={isIngesting}
                        />
                      </div>
                      {manualLinkInputs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeManualLinkRow(idx)}
                          disabled={isIngesting}
                          title="Remove this link"
                          className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={addManualLinkRow}
                    disabled={isIngesting}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 hover:bg-brand-50/60 px-2.5 py-1.5 rounded-lg border border-dashed border-brand-300 hover:border-brand-400 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Another Link</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddManualLinks}
                    disabled={manualLinkInputs.every((u) => !u.trim()) || isIngesting}
                    className="btn btn-secondary text-xs py-1.5 px-3"
                  >
                    Add to Selection
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* OneDrive Tab */}
          {activeTab === 'onedrive' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src="https://spoprod-a.akamaihd.net/files/fabric/assets/brand-icons/product/svg/onedrive_48x1.svg"
                      alt="OneDrive"
                      className="w-5 h-5 object-contain"
                    />
                    <span className="text-xs font-bold text-slate-800">Microsoft OneDrive Integration</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Connect your Microsoft Personal or Work/School account to select files directly from your OneDrive or SharePoint.
                </p>

                <button
                  type="button"
                  onClick={handleOpenOneDrivePicker}
                  disabled={isLoadingSdk || isIngesting}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:border-blue-500 bg-white hover:bg-blue-50/30 text-slate-800 font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
                >
                  <img
                    src="https://spoprod-a.akamaihd.net/files/fabric/assets/brand-icons/product/svg/onedrive_48x1.svg"
                    alt="OneDrive"
                    className="w-4 h-4"
                  />
                  Browse & Select from Microsoft OneDrive
                </button>
              </div>

              {/* Dynamic OneDrive shared link inputs */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Paste OneDrive or SharePoint Shared Links</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    &quot;Anyone with the link can view&quot;
                  </span>
                </div>

                <div className="space-y-2">
                  {manualLinkInputs.map((link, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="url"
                          value={link}
                          onChange={(e) => handleManualLinkChange(idx, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addManualLinkRow();
                            }
                          }}
                          placeholder="https://1drv.ms/b/s!... or https://company-my.sharepoint.com/:b:/g/personal/..."
                          className="field w-full text-xs font-mono py-2"
                          disabled={isIngesting}
                        />
                      </div>
                      {manualLinkInputs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeManualLinkRow(idx)}
                          disabled={isIngesting}
                          title="Remove this link"
                          className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={addManualLinkRow}
                    disabled={isIngesting}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50/60 px-2.5 py-1.5 rounded-lg border border-dashed border-blue-300 hover:border-blue-400 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Another Link</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddManualLinks}
                    disabled={manualLinkInputs.every((u) => !u.trim()) || isIngesting}
                    className="btn btn-secondary text-xs py-1.5 px-3"
                  >
                    Add to Selection
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Staging Review Drawer */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>Selected Resumes ({selectedFiles.length})</span>
                <button
                  type="button"
                  onClick={() => setSelectedFiles([])}
                  className="text-red-500 hover:text-red-600 text-[11px] font-semibold"
                >
                  Clear all
                </button>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 border border-slate-200 rounded-xl p-2 bg-slate-50/60">
                {selectedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 text-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-2 truncate min-w-0">
                      <FileText className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                      <span className="truncate font-medium text-slate-800">{file.name}</span>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                        {file.source}
                      </span>
                      {file.size && (
                        <span className="text-[10px] text-slate-400 shrink-0">
                          ({(file.size / 1024).toFixed(0)} KB)
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFiles((prev) => prev.filter((f) => f.id !== file.id))}
                      className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors"
                      title="Remove file"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            Files are imported securely and evaluated directly in your pipeline.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isIngesting}
              className="btn btn-secondary text-xs px-3.5 py-2"
            >
              Cancel
            </button>
            {(() => {
              const pendingValidCount = manualLinkInputs.filter((u) => u.trim().length > 5).length;
              const totalCount = selectedFiles.length + pendingValidCount;
              return (
                <button
                  type="button"
                  onClick={handleStartIngest}
                  disabled={isIngesting || totalCount === 0}
                  className="btn btn-primary text-xs px-4 py-2 flex items-center gap-2 shadow-xs"
                >
                  {isIngesting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Ingesting ({totalCount})...</span>
                    </>
                  ) : (
                    <>
                      <span>Ingest & Screen ({totalCount})</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              );
            })()}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
