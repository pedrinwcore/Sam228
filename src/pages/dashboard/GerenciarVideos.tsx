import React, { useState, useEffect } from 'react';
import { ChevronLeft, Upload, Play, Trash2, FolderPlus, Video, Eye, EyeOff, RefreshCw, Edit2, Save, X, Maximize, Minimize, ExternalLink, Download, AlertCircle, CheckCircle, HardDrive, Folder, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import IFrameVideoPlayer from '../../components/IFrameVideoPlayer';

interface Video {
  id: number;
  nome: string;
  url: string;
  duracao?: number;
  tamanho?: number;
  bitrate_video?: number;
  formato_original?: string;
  codec_video?: string;
  is_mp4?: boolean;
  compativel?: string;
  largura?: number;
  altura?: number;
  folder?: string;
  user?: string;
  user_bitrate_limit?: number;
  bitrate_exceeds_limit?: boolean;
  needs_conversion?: boolean;
  compatibility_status?: string;
  compatibility_message?: string;
  codec_compatible?: boolean;
  format_compatible?: boolean;
}

interface Folder {
  id: number;
  nome: string;
  espaco?: number;
  espaco_usado?: number;
  servidor_id?: number;
  video_count_db?: number;
  server_info?: {
    exists: boolean;
    file_count: number;
    size_mb: number;
    path: string;
    error?: string;
  };
  percentage_used?: number;
}

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

const GerenciarVideos: React.FC = () => {
  const { user, getToken } = useAuth();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showEditFolderModal, setShowEditFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    loadFolders();
  }, []);

  useEffect(() => {
    if (selectedFolder) {
      loadVideos();
      loadFolderInfo(selectedFolder);
      
      // Sincronização automática em background
      const autoSyncTimeout = setTimeout(() => {
        syncFolder(selectedFolder);
      }, 2000);
      
      return () => clearTimeout(autoSyncTimeout);
    }
  }, [selectedFolder]);

  const loadFolders = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/folders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setFolders(data);

      if (data.length > 0 && !selectedFolder) {
        setSelectedFolder(data[0].id.toString());
      }
    } catch (error) {
      toast.error('Erro ao carregar pastas');
    }
  };

  const loadFolderInfo = async (folderId: string) => {
    try {
      const token = await getToken();
      const response = await fetch(`/api/folders/${folderId}/info`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const folderInfo = await response.json();
        setFolders(prev => prev.map(f =>
          f.id.toString() === folderId ? { ...f, ...folderInfo } : f
        ));
      }
    } catch (error) {
      console.error('Erro ao carregar informações da pasta:', error);
    }
  };

  const loadVideos = async () => {
    if (!selectedFolder) return;

    setLoading(true);
    try {
      const token = await getToken();
      
      // Carregar vídeos diretamente do banco primeiro para melhor performance
      const response = await fetch(`/api/videos?folder_id=${selectedFolder}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setVideos(data);
        console.log(`📊 Carregados ${data.length} vídeos do banco`);
        
        // Se não há vídeos, tentar sincronizar
        if (data.length === 0) {
          console.log('Nenhum vídeo no banco, tentando sincronizar...');
          await syncFolderVideos();
        }
      } else {
        console.error('Resposta inválida da API:', data);
        setVideos([]);
        toast.error('Erro ao carregar vídeos: resposta inválida');
      }

    } catch (error) {
      console.error('Erro ao carregar vídeos:', error);
      toast.error('Erro ao carregar vídeos');
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const syncFolderVideos = async () => {
    try {
      const token = await getToken();
      console.log(`🔄 Sincronizando pasta ${selectedFolder} com servidor...`);
      
      const syncResponse = await fetch(`/api/videos-ssh/sync-database`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ folderId: selectedFolder })
      });
      
      if (syncResponse.ok) {
        const syncData = await syncResponse.json();
        console.log(`✅ Sincronização concluída:`, syncData);
        
        if (syncData.success && syncData.videos_count > 0) {
          toast.success(`Sincronização: ${syncData.videos_count} vídeos encontrados`);
          
          // Recarregar vídeos após sincronização
          const response = await fetch(`/api/videos?folder_id=${selectedFolder}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await response.json();
          
          if (Array.isArray(data)) {
            setVideos(data);
          }
        }
      }

    } catch (syncError) {
      console.warn('Erro na sincronização:', syncError);
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error('Nome da pasta é obrigatório');
      return;
    }

    try {
      const token = await getToken();
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ nome: newFolderName.trim() })
      });

      if (response.ok) {
        const newFolder = await response.json();
        toast.success('Pasta criada com sucesso!');
        setShowNewFolderModal(false);
        setNewFolderName('');
        
        // Recarregar pastas imediatamente
        loadFolders();
        
        setSelectedFolder(newFolder.id.toString());
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Erro ao criar pasta');
      }
    } catch (error) {
      console.error('Erro ao criar pasta:', error);
      toast.error('Erro ao criar pasta');
    }
  };

  const editFolder = async () => {
    if (!editFolderName.trim() || !editingFolder) {
      toast.error('Nome da pasta é obrigatório');
      return;
    }

    try {
      const token = await getToken();
      const response = await fetch(`/api/folders/${editingFolder.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ nome: editFolderName.trim() })
      });

      if (response.ok) {
        toast.success('Pasta renomeada com sucesso!');
        setShowEditFolderModal(false);
        setEditingFolder(null);
        setEditFolderName('');
        loadFolders();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Erro ao renomear pasta');
      }
    } catch (error) {
      console.error('Erro ao renomear pasta:', error);
      toast.error('Erro ao renomear pasta');
    }
  };

  const deleteFolder = async (folder: Folder) => {
    if (!confirm(`Deseja realmente excluir a pasta "${folder.nome}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const token = await getToken();
      const response = await fetch(`/api/folders/${folder.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Pasta excluída com sucesso!');
        loadFolders();

        // Se a pasta excluída era a selecionada, limpar seleção
        if (selectedFolder === folder.id.toString()) {
          setSelectedFolder('');
          setVideos([]);
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Erro ao excluir pasta');
      }
    } catch (error) {
      console.error('Erro ao excluir pasta:', error);
      toast.error('Erro ao excluir pasta');
    }
  };

  const syncFolder = async (folderId: string) => {
    try {
      const token = await getToken();
      
      // Primeiro sincronizar com banco de dados
      const syncResponse = await fetch(`/api/videos-ssh/sync-database`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ folderId })
      });
      
      if (syncResponse.ok) {
        const syncData = await syncResponse.json();
        
        if (syncData.success) {
          // Sincronização silenciosa - apenas log no console
          console.log(`📊 Sincronização automática: ${syncData.videos_count} vídeos`);
        } else {
          console.warn('Sincronização parcial:', syncData.message);
        }
      }
      
      // Depois sincronizar pasta no servidor
      const response = await fetch(`/api/folders/${folderId}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        const folderSyncData = await response.json();
        
        loadFolderInfo(folderId);
        loadVideos(); // Recarregar vídeos após sincronização
      } else {
        const errorData = await response.json();
        console.warn('Erro na sincronização da pasta:', errorData.error);
      }
    } catch (error) {
      console.error('Erro ao sincronizar pasta:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (!selectedFolder) {
      toast.error('Selecione uma pasta primeiro');
      return;
    }

    setUploading(true);
    const progressArray: UploadProgress[] = Array.from(files).map(file => ({
      fileName: file.name,
      progress: 0,
      status: 'uploading'
    }));
    setUploadProgress(progressArray);

    try {
      const token = await getToken();

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('video', file);

        try {
          const response = await fetch(`/api/videos/upload?folder_id=${selectedFolder}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData
          });

          if (response.ok) {
            setUploadProgress(prev => prev.map(p =>
              p.fileName === file.name ? { ...p, progress: 100, status: 'completed' } : p
            ));
          } else {
            const errorData = await response.json();
            setUploadProgress(prev => prev.map(p =>
              p.fileName === file.name ? { ...p, status: 'error', error: errorData.error } : p
            ));
          }
        } catch (error) {
          setUploadProgress(prev => prev.map(p =>
            p.fileName === file.name ? { ...p, status: 'error', error: 'Erro de conexão' } : p
          ));
        }
      }

      const successCount = progressArray.filter(p => p.status === 'completed').length;
      if (successCount > 0) {
        toast.success(`${successCount} vídeo(s) enviado(s) com sucesso!`);
        loadVideos();
        loadFolderInfo(selectedFolder);
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro no upload dos vídeos');
    } finally {
      setUploading(false);
      // Limpar progresso após 3 segundos
      setTimeout(() => setUploadProgress([]), 3000);
    }

    // Limpar input
    event.target.value = '';
  };

  const deleteVideo = async (video: Video) => {
    if (!confirm(`Deseja realmente excluir o vídeo "${video.nome}"?`)) return;

    try {
      const token = await getToken();
      const response = await fetch(`/api/videos/${video.id}?folder_id=${selectedFolder}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Vídeo excluído com sucesso!');
        loadVideos();
        loadFolderInfo(selectedFolder);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Erro ao excluir vídeo');
      }
    } catch (error) {
      console.error('Erro ao excluir vídeo:', error);
      toast.error('Erro ao excluir vídeo');
    }
  };

  // Função para construir URL direta do Wowza
  const buildWowzaDirectUrl = (video: Video) => {
    if (!video.url) return '';

    // Usar nova API para construir URL
    return `/api/videos/view-url?video_id=${video.id}`;
  };

  // Função para construir URL HLS do Wowza
  const buildWowzaHLSUrl = (video: Video) => {
    if (!video.url) return '';

    // Usar nova API para construir URL
    return `/api/videos/view-url?video_id=${video.id}`;
  };

  const openVideoPlayer = (video: Video) => {
    setCurrentVideo(video);
    setShowVideoModal(true);
  };

  const closeVideoPlayer = () => {
    setShowVideoModal(false);
    setCurrentVideo(null);
    setIsFullscreen(false);
  };

  const openVideoInNewTab = (video: Video) => {
    if (!video.url) {
      toast.error('URL do vídeo não disponível');
      return;
    }

    // Usar função auxiliar para construir URL
    const directUrl = buildExternalPlayerUrl(video.url);
    if (directUrl) {
      window.open(directUrl, '_blank');
    } else {
      toast.error('Não foi possível construir URL do vídeo');
    }
  };

  // Função auxiliar para construir URL do player externo
  const buildExternalPlayerUrl = (videoPath: string) => {
    if (!videoPath) return '';

    // Extrair informações do caminho
    const cleanPath = videoPath.replace(/^\/+/, '').replace(/^(content\/|streaming\/)?/, '');
    const pathParts = cleanPath.split('/');
    
    if (pathParts.length >= 3) {
      const userLogin = pathParts[0];
      const folderName = pathParts[1];
      const fileName = pathParts[2];
      
      const finalFileName = fileName.endsWith('.mp4') ? fileName : fileName.replace(/\.[^/.]+$/, '.mp4');
      // SEMPRE usar domínio do Wowza, NUNCA o domínio da aplicação
      const domain = 'stmv1.udicast.com';
      
      return `https://${domain}:1443/play.php?login=${userLogin}&video=${folderName}/${finalFileName}`;
    }
    
    return '';
  };
  const downloadVideo = (video: Video) => {
    // Usar mesma lógica do openVideoInNewTab para download
    openVideoInNewTab(video);
    toast.success('Abrindo vídeo para download!');
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };

  const formatDuration = (seconds: number): string => {
    if (!seconds) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const [videoUrl, setVideoUrl] = useState('');
  const [videoHlsUrl, setVideoHlsUrl] = useState('');

  useEffect(() => {
    if (!currentVideo) return;

    // Construir URL do player externo
    const playerUrl = buildExternalPlayerUrl(currentVideo.url);
    setVideoUrl(playerUrl);
    setVideoHlsUrl(playerUrl);
  }, [currentVideo]);


  const selectedFolderData = folders.find(f => f.id.toString() === selectedFolder);

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <Link to="/dashboard" className="flex items-center text-primary-600 hover:text-primary-800">
          <ChevronLeft className="h-5 w-5 mr-1" />
          <span>Voltar ao Dashboard</span>
        </Link>
      </div>

      <div className="flex items-center space-x-3">
        <Video className="h-8 w-8 text-primary-600" />
        <h1 className="text-3xl font-bold text-gray-900">Gerenciar Vídeos</h1>
      </div>

      {/* Informações do usuário */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <HardDrive className="h-5 w-5 text-blue-600 mr-2" />
            <div>
              <h3 className="text-blue-900 font-medium">Informações do Plano</h3>
              <p className="text-blue-800 text-sm">
                Bitrate máximo: <strong>{user?.bitrate || 2500} kbps</strong> •
                Armazenamento: <strong>{user?.espaco || 1000} MB</strong>
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-blue-800 text-sm">
              Servidor: <strong>Wowza (51.222.156.223)</strong>
            </p>
            <p className="text-blue-700 text-xs">
              Vídeos servidos diretamente do Wowza
            </p>
          </div>
        </div>
      </div>

      {/* Gerenciamento de Pastas */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Pastas</h2>
          <button
            onClick={() => setShowNewFolderModal(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center"
          >
            <FolderPlus className="h-4 w-4 mr-2" />
            Nova Pasta
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {folders.map((folder) => (
            <div
              key={folder.id}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${selectedFolder === folder.id.toString()
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
                }`}
              onClick={() => setSelectedFolder(folder.id.toString())}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Folder className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="font-medium text-gray-900">{folder.nome}</h3>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingFolder(folder);
                      setEditFolderName(folder.nome);
                      setShowEditFolderModal(true);
                    }}
                    className="text-blue-600 hover:text-blue-800 p-1"
                    title="Editar pasta"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Sincronização manual apenas se necessário
                      if (!folder.server_info?.exists) {
                        syncFolder(folder.id.toString());
                        toast.info('Criando pasta no servidor...');
                      }
                    }}
                    className="text-green-600 hover:text-green-800 p-1"
                    title="Criar pasta no servidor"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFolder(folder);
                    }}
                    className="text-red-600 hover:text-red-800 p-1"
                    title="Excluir pasta"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Vídeos (DB):</span>
                  <span>{folder.video_count_db || 0}</span>
                </div>
                {folder.server_info && (
                  <div className="flex justify-between">
                    <span>Arquivos (Servidor):</span>
                    <span className={folder.server_info.exists ? 'text-green-600' : 'text-red-600'}>
                      {folder.server_info.exists ? folder.server_info.file_count : 'N/A'}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Espaço usado:</span>
                  <span>{folder.espaco_usado || 0} MB</span>
                </div>
                {folder.percentage_used !== undefined && (
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full ${folder.percentage_used > 90 ? 'bg-red-600' :
                        folder.percentage_used > 70 ? 'bg-yellow-600' : 'bg-green-600'
                        }`}
                      style={{ width: `${Math.min(100, folder.percentage_used)}%` }}
                    ></div>
                  </div>
                )}
              </div>

              {folder.server_info && !folder.server_info.exists && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                  ⚠️ Pasta não existe no servidor
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Lista de Vídeos */}
      {selectedFolder && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-semibold text-gray-800">
                Vídeos - {selectedFolderData?.nome}
              </h2>
              {selectedFolderData?.server_info && (
                <span className={`text-xs px-2 py-1 rounded-full ${selectedFolderData.server_info.exists ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                  Servidor: {selectedFolderData.server_info.exists ? 'OK' : 'Erro'}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={loadVideos}
                disabled={loading}
                className="text-primary-600 hover:text-primary-800"
                title="Atualizar lista"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <label className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 cursor-pointer flex items-center">
                <Upload className="h-4 w-4 mr-2" />
                Upload Vídeos
                <input
                  type="file"
                  multiple
                  accept="video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
          </div>

          {/* Progresso do Upload */}
          {uploadProgress.length > 0 && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-800 mb-3">Progresso do Upload</h3>
              <div className="space-y-2">
                {uploadProgress.map((progress, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 truncate flex-1 mr-4">
                      {progress.fileName}
                    </span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${progress.status === 'completed' ? 'bg-green-600' :
                            progress.status === 'error' ? 'bg-red-600' : 'bg-blue-600'
                            }`}
                          style={{ width: `${progress.progress}%` }}
                        ></div>
                      </div>
                      <span className={`text-xs ${progress.status === 'completed' ? 'text-green-600' :
                        progress.status === 'error' ? 'text-red-600' : 'text-blue-600'
                        }`}>
                        {progress.status === 'completed' ? 'Concluído' :
                          progress.status === 'error' ? 'Erro' : 'Enviando...'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {videos.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Video className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg mb-2">Nenhum vídeo encontrado</p>
              <p className="text-sm mb-4">Faça upload de vídeos ou sincronize com o servidor</p>
              {selectedFolder && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">
                    A sincronização com o servidor é feita automaticamente
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Vídeo</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">Formato</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">Bitrate</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">Tamanho</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">Duração</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">Status</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {videos.map((video) => (
                    <tr key={video.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <Video className="h-5 w-5 text-gray-400" />
                          <div>
                            <div className="font-medium text-gray-900 truncate max-w-xs" title={video.nome}>
                              {video.nome}
                            </div>
                            <div className="text-xs text-gray-500">
                              ID: {video.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${video.is_mp4 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                          {video.formato_original?.toUpperCase() || 'N/A'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`font-medium ${video.bitrate_exceeds_limit ? 'text-red-600' : 'text-gray-900'
                            }`}>
                            {video.bitrate_video || 'N/A'} kbps
                          </span>
                          {video.bitrate_exceeds_limit && (
                            <span className="text-xs text-red-600">
                              Limite: {video.user_bitrate_limit} kbps
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center text-sm text-gray-600">
                        {video.tamanho ? formatFileSize(video.tamanho) : 'N/A'}
                      </td>

                      <td className="py-3 px-4 text-center text-sm text-gray-600">
                        {video.duracao ? formatDuration(video.duracao) : 'N/A'}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          {video.compatibility_status === 'compatible' ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : video.compatibility_status === 'needs_conversion' ? (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                          )}
                          <span className={`text-xs font-medium ${
                            video.compatibility_status === 'compatible' ? 'text-green-600' :
                            video.compatibility_status === 'needs_conversion' ? 'text-red-600' :
                            'text-yellow-600'
                            }`}>
                            {video.compatibility_message || 'Verificando...'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => openVideoPlayer(video)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="Reproduzir vídeo"
                          >
                            <Play className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => openVideoInNewTab(video)}
                            className="text-green-600 hover:text-green-800 p-1"
                            title="Abrir em nova aba (Wowza direto)"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => downloadVideo(video)}
                            className="text-purple-600 hover:text-purple-800 p-1"
                            title="Download direto do Wowza"
                          >
                            <Download className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => deleteVideo(video)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Excluir vídeo"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Sincronização automática em background */}
          {selectedFolderData && !selectedFolderData.server_info?.exists && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-yellow-600 mr-3" />
                <div>
                  <p className="text-yellow-800 text-sm font-medium">
                    Sincronizando pasta com o servidor...
                  </p>
                  <p className="text-yellow-700 text-xs">
                    A pasta será criada automaticamente no servidor
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Nova Pasta */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Nova Pasta</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome da pasta:
              </label>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder="Digite o nome da pasta"
                onKeyPress={(e) => e.key === 'Enter' && createFolder()}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowNewFolderModal(false);
                  setNewFolderName('');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={createFolder}
                disabled={!newFolderName.trim()}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                Criar Pasta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Pasta */}
      {showEditFolderModal && editingFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Editar Pasta</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome da pasta:
              </label>
              <input
                type="text"
                value={editFolderName}
                onChange={(e) => setEditFolderName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder="Digite o novo nome da pasta"
                onKeyPress={(e) => e.key === 'Enter' && editFolder()}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowEditFolderModal(false);
                  setEditingFolder(null);
                  setEditFolderName('');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={editFolder}
                disabled={!editFolderName.trim()}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 flex items-center"
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal do Player */}
      {showVideoModal && currentVideo && (
        <div
          className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeVideoPlayer();
            }
          }}
        >
          <div className={`bg-black rounded-lg relative ${isFullscreen ? 'w-screen h-screen' : 'max-w-4xl w-full h-[70vh]'
            }`}>
            {/* Botão de fechar */}
            <button
              onClick={closeVideoPlayer}
              className="absolute top-4 right-4 z-20 text-white bg-red-600 hover:bg-red-700 rounded-full p-2 transition-colors duration-200 shadow-lg"
              title="Fechar player"
            >
              <X size={16} />
            </button>

            {/* Player iFrame apenas */}
            <div className="w-full h-full">
              <IFrameVideoPlayer
                src={videoUrl}
                title={currentVideo.nome}
                autoplay
                controls
                className="w-full h-full"
                onError={(error) => {
                  console.error('Erro no IFrame player:', error);
                  // Fallback: abrir em nova aba
                  openVideoInNewTab(currentVideo);
                }}
                onReady={() => {
                  console.log('IFrame player pronto para reprodução');
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Como utilizar */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <CheckCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
          <div>
            <h3 className="text-blue-900 font-medium mb-2">📚 Como utilizar o Gerenciador de Vídeos</h3>
            <ul className="text-blue-800 text-sm space-y-1">
              <li>• <strong>Criar Pastas:</strong> Organize seus vídeos em pastas temáticas</li>
              <li>• <strong>Upload de Vídeos:</strong> Arraste arquivos ou clique em "Upload Vídeos"</li>
              <li>• <strong>Formatos Aceitos:</strong> MP4, AVI, MOV, WMV, FLV, WebM, MKV e outros</li>
              <li>• <strong>Visualizar:</strong> Clique no botão "Play" para assistir seus vídeos</li>
              <li>• <strong>Compartilhar:</strong> Use o botão "Abrir em nova aba" para compartilhar</li>
              <li>• <strong>Organização:</strong> Renomeie pastas e organize seu conteúdo</li>
              <li>• <strong>Sincronização:</strong> Use "Sincronizar" se vídeos não aparecerem</li>
              <li>• <strong>Espaço:</strong> Monitore o uso do seu plano de armazenamento</li>
              <li>• <strong>Qualidade:</strong> Vídeos são otimizados automaticamente para streaming</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GerenciarVideos;