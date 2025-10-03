import React, { useState } from 'react';
import { ChevronLeft, Copy, Server, Eye, EyeOff, Radio, CheckCircle, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';

const DadosConexao: React.FC = () => {
  const { user } = useAuth();
  const [showFtpPassword, setShowFtpPassword] = useState(false);
  const [showStreamPassword, setShowStreamPassword] = useState(false);

  const userLogin = user?.usuario || (user?.email ? user.email.split('@')[0] : `user_${user?.id || 'usuario'}`);
  const userPassword = 'teste2025'; // Senha padrão do usuário para streaming

  // Dados de conexão FTP
  const ftpData = {
    servidor: 'stmv1.udicast.com',
    usuario: userLogin,
    senha: userPassword, // Usar senha do usuário
    porta: '21'
  };

  // Dados de streaming ao vivo (FMS)
  const streamingData = {
    servidor: 'stmv1.udicast.com',
    porta: '1935',
    aplicacao: userLogin,
    rtmpUrl: `rtmp://stmv1.udicast.com:1935/${userLogin}`,
    usuario: userLogin,
    senha: userPassword, // Senha do usuário
    stream: 'live',
    bitrate: user?.bitrate || 2500,
    profileFmleUrl: '/api/dados-conexao/fmle-profile' // URL para download do profile FMLE personalizado
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado para a área de transferência!`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <Link to="/dashboard" className="flex items-center text-primary-600 hover:text-primary-800">
          <ChevronLeft className="h-5 w-5 mr-1" />
          <span>Voltar ao Dashboard</span>
        </Link>
      </div>

      <div className="flex items-center space-x-3">
        <Server className="h-8 w-8 text-primary-600" />
        <h1 className="text-3xl font-bold text-gray-900">Dados de Conexão</h1>
      </div>

      {/* Dados de Streaming Ao Vivo (FMS) */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Radio className="h-6 w-6 text-red-600" />
          <h2 className="text-xl font-semibold text-gray-800">Dados de Streaming Ao Vivo (FMS)</h2>
        </div>

        <div className="border border-gray-300 rounded-lg overflow-hidden">
          <table className="w-full">
            <tbody className="bg-gray-50">
              <tr className="border-b border-gray-200">
                <td className="w-40 h-8 px-3 py-2 text-left font-medium text-gray-700 bg-gray-100">Servidor FMS</td>
                <td className="px-3 py-2 text-left">
                  <div className="flex items-center">
                    <span className="text-gray-900 font-mono text-sm">{streamingData.rtmpUrl}</span>
                    <button
                      className="ml-2 text-primary-600 hover:text-primary-800"
                      onClick={() => copyToClipboard(streamingData.rtmpUrl, 'Servidor FMS')}
                      title="Copiar/Copy"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>

              <tr className="border-b border-gray-200">
                <td className="w-40 h-8 px-3 py-2 text-left font-medium text-gray-700 bg-gray-100">Stream</td>
                <td className="px-3 py-2 text-left">
                  <div className="flex items-center">
                    <span className="text-gray-900 font-mono text-sm">{streamingData.stream}</span>
                    <button
                      className="ml-2 text-primary-600 hover:text-primary-800"
                      onClick={() => copyToClipboard(streamingData.stream, 'Stream')}
                      title="Copiar/Copy"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>

              <tr className="border-b border-gray-200">
                <td className="w-40 h-8 px-3 py-2 text-left font-medium text-gray-700 bg-gray-100">Bitrate</td>
                <td className="px-3 py-2 text-left">
                  <div className="flex items-center">
                    <span className="text-gray-900 font-mono text-sm">{streamingData.bitrate} Kbps (video + audio)</span>
                    <button
                      className="ml-2 text-primary-600 hover:text-primary-800"
                      onClick={() => copyToClipboard(streamingData.bitrate.toString(), 'Bitrate')}
                      title="Copiar/Copy"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>

              <tr className="border-b border-gray-200">
                <td className="w-40 h-8 px-3 py-2 text-left font-medium text-gray-700 bg-gray-100">Usuário/Login</td>
                <td className="px-3 py-2 text-left">
                  <div className="flex items-center">
                    <span className="text-gray-900 font-mono text-sm">{streamingData.usuario}</span>
                    <button
                      className="ml-2 text-primary-600 hover:text-primary-800"
                      onClick={() => copyToClipboard(streamingData.usuario, 'Usuário')}
                      title="Copiar/Copy"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>

              <tr className="border-b border-gray-200">
                <td className="w-40 h-8 px-3 py-2 text-left font-medium text-gray-700 bg-gray-100">Senha</td>
                <td className="px-3 py-2 text-left">
                  <div className="flex items-center">
                    <div className="relative">
                      <span className="text-gray-900 font-mono text-sm mr-2">{showStreamPassword ? streamingData.senha : '••••••••••••'}</span>
                      <button
                        onClick={() => setShowStreamPassword(!showStreamPassword)}
                        className="text-gray-400 hover:text-gray-600 mr-2"
                        title={showStreamPassword ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {showStreamPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <button
                      className="text-primary-600 hover:text-primary-800"
                      onClick={() => copyToClipboard(streamingData.senha, 'Senha')}
                      title="Copiar/Copy"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>

              <tr>
                <td className="w-40 h-8 px-3 py-2 text-left font-medium text-gray-700 bg-gray-100">Profile FMLE</td>
                <td className="px-3 py-2 text-left">
                  <div className="flex items-center">
                    <a
                      href={streamingData.profileFmleUrl}
                      download="profile_fmle.xml"
                      className="text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </a>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Dados de Conexão FTP */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Server className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-800">Dados de Conexão FTP</h2>
        </div>

        <div className="border border-gray-300 rounded-lg overflow-hidden">
          <table className="w-full">
            <tbody className="bg-gray-50">
              <tr className="border-b border-gray-200">
                <td className="w-40 h-8 px-3 py-2 text-left font-medium text-gray-700 bg-gray-100">Servidor/Server/Host</td>
                <td className="px-3 py-2 text-left">
                  <div className="flex items-center">
                    <span className="text-gray-900 font-mono text-sm">{ftpData.servidor}</span>
                    <button
                      className="ml-2 text-primary-600 hover:text-primary-800"
                      onClick={() => copyToClipboard(ftpData.servidor, 'Servidor FTP')}
                      title="Copiar/Copy"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>

              <tr className="border-b border-gray-200">
                <td className="w-40 h-8 px-3 py-2 text-left font-medium text-gray-700 bg-gray-100">Usuário</td>
                <td className="px-3 py-2 text-left">
                  <div className="flex items-center">
                    <span className="text-gray-900 font-mono text-sm">{ftpData.usuario}</span>
                    <button
                      className="ml-2 text-primary-600 hover:text-primary-800"
                      onClick={() => copyToClipboard(ftpData.usuario, 'Usuário FTP')}
                      title="Copiar/Copy"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>

              <tr className="border-b border-gray-200">
                <td className="w-40 h-8 px-3 py-2 text-left font-medium text-gray-700 bg-gray-100">Senha</td>
                <td className="px-3 py-2 text-left">
                  <div className="flex items-center">
                    <div className="relative">
                      <span className="text-gray-900 font-mono text-sm mr-2">{showFtpPassword ? ftpData.senha : '••••••••••••'}</span>
                      <button
                        onClick={() => setShowFtpPassword(!showFtpPassword)}
                        className="text-gray-400 hover:text-gray-600 mr-2"
                        title={showFtpPassword ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {showFtpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <button
                      className="text-primary-600 hover:text-primary-800"
                      onClick={() => copyToClipboard(ftpData.senha, 'Senha FTP')}
                      title="Copiar/Copy"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>

              <tr>
                <td className="w-40 h-8 px-3 py-2 text-left font-medium text-gray-700 bg-gray-100">Porta FTP</td>
                <td className="px-3 py-2 text-left">
                  <span className="text-gray-900 font-mono text-sm">{ftpData.porta}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Informações de Ajuda */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-start">
          <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
          <div>
            <h3 className="text-green-900 font-medium mb-2">💡 Como usar os dados de conexão</h3>
            <ul className="text-green-800 text-sm space-y-1">
              <li>• <strong>Streaming Ao Vivo (FMS):</strong> Use para softwares como OBS, XSplit, FMLE</li>
              <li>• <strong>RTMP URL:</strong> rtmp://stmv1.udicast.com:1935/{userLogin}</li>
              <li>• <strong>Stream Name:</strong> live</li>
              <li>• <strong>Bitrate Máximo:</strong> {user?.bitrate || 2500} kbps (video + audio)</li>
              <li>• <strong>Profile FMLE:</strong> Baixe o arquivo de configuração para Flash Media Live Encoder</li>
              <li>• <strong>Dados FTP:</strong> Use para conectar softwares como FileZilla ou WinSCP</li>
              <li>• <strong>Upload de vídeos:</strong> Envie seus arquivos diretamente para o servidor</li>
              <li>• <strong>Organização:</strong> Crie pastas para organizar seu conteúdo</li>
              <li>• <strong>Formatos aceitos:</strong> MP4, AVI, MOV, WMV, FLV, WebM, MKV</li>
              <li>• <strong>Senha:</strong> A mesma senha é usada para FTP e streaming</li>
              <li>• <strong>Segurança:</strong> Mantenha suas credenciais em segurança</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DadosConexao;