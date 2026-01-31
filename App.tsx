import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Activity, 
  FileText, 
  Database, 
  CalendarClock, 
  Users, 
  Printer, 
  ShieldAlert, 
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
  Search,
  Download,
  Upload,
  Save,
  CheckCircle,
  AlertTriangle,
  Clock,
  ChevronRight,
  List,
  BookOpen,
  Lock,
  Filter,
  Trash2,
  Edit,
  User,
  Calendar,
  Eye,
  Loader,
  RefreshCw,
  ArrowLeft,
  MoreVertical
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { LOGO_URL, DEFAULT_CONFIG } from './constants';
import { Student, Subject, Question, AppConfig } from './types';
import { supabase } from './supabaseClient';
import * as XLSX from 'xlsx';

// --- Shared Utilities ---

// Legacy CSV Parser (kept for backup/utils, though BankSoal now uses XLSX)
const parseCSV = (text: string) => {
  const lines = text.split(/\r?\n/);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const data = [];
  for(let i = 1; i < lines.length; i++) {
     if(!lines[i].trim()) continue;
     const rowValues: string[] = [];
     let currentVal = '';
     let inQuote = false;
     for (let j = 0; j < lines[i].length; j++) {
         const char = lines[i][j];
         if (char === '"' && lines[i][j+1] === '"') { currentVal += '"'; j++; } 
         else if (char === '"') { inQuote = !inQuote; } 
         else if (char === ',' && !inQuote) { rowValues.push(currentVal); currentVal = ''; } 
         else { currentVal += char; }
     }
     rowValues.push(currentVal);
     const obj: any = {};
     headers.forEach((h, index) => {
        let val = rowValues[index]?.trim();
        if (val && val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        obj[h] = val;
     });
     data.push(obj);
  }
  return data;
};

const downloadCSV = (headers: string[], filename: string) => {
  const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n";
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children?: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 print:hidden">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
        <div className="bg-blue-600 p-4 flex justify-between items-center text-white shrink-0">
          <h3 className="font-bold text-lg">{title}</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};

// --- UNIFIED LOGIN COMPONENT ---

const UniversalLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Logic: Check Admin
    if (username === 'admin' && password === 'admin') {
      localStorage.setItem('userRole', 'admin');
      setLoading(false);
      navigate('/admin/dashboard');
      return;
    }

    // Logic: Check Student from Supabase
    try {
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .eq('nisn', username)
            .eq('password', password)
            .single();

        if (error || !data) {
             throw new Error('NISN atau Password salah!');
        }

        if (data) {
             localStorage.setItem('userRole', 'student');
             const studentData = { 
                 id: data.id,
                 name: data.name, 
                 nisn: data.nisn, 
                 school: data.school 
             };
             localStorage.setItem('studentData', JSON.stringify(studentData));
             
             // Update login status
             await supabase.from('students').update({ is_login: true, status: 'idle' }).eq('id', data.id);
             
             navigate('/student/dashboard');
        }

    } catch (err: any) {
        setError(err.message || 'Login gagal. Periksa koneksi atau kredensial.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 relative overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-full h-full bg-blue-50 opacity-50 z-0"></div>
      
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md z-10 relative border-t-4 border-blue-500">
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
             <img src={localStorage.getItem('logoUrl') || LOGO_URL} alt="Logo" className="w-24 h-24 relative z-10" />
             <div className="absolute inset-0 bg-blue-400 blur-xl opacity-30 animate-pulse rounded-full z-0"></div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">{localStorage.getItem('appName') || 'TKA MANDIRI'}</h2>
          <p className="text-gray-500 text-sm">Masuk sebagai Guru atau Siswa</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username / NISN</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-gray-400" size={20} />
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Masukkan Username atau NISN"
                required
              />
            </div>
          </div>
          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
             <div className="relative">
               <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
               <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="********"
                  required
                />
             </div>
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-2 rounded text-center font-medium">{error}</div>}
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-blue-500/30 transform hover:-translate-y-1 flex justify-center items-center gap-2">
            {loading ? <Loader className="animate-spin" size={20}/> : 'MASUK APLIKASI'}
          </button>
        </form>
        
        <div className="mt-6 text-center text-xs text-gray-400">
          &copy; 2026 TKA Mandiri. All rights reserved.
        </div>
      </div>
    </div>
  );
};

// --- ADMIN COMPONENTS ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
      active ? 'bg-blue-700 text-white border-l-4 border-white' : 'text-blue-100 hover:bg-blue-800 hover:text-white'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium text-sm">{label}</span>
  </button>
);

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        subjects: 0,
        students: 0,
        schools: 0,
        finished: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { count: subjectCount } = await supabase.from('subjects').select('*', { count: 'exact', head: true });
                const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true });
                const { data: schoolData } = await supabase.from('students').select('school');
                const uniqueSchools = new Set(schoolData?.map(s => s.school)).size;
                const { count: finishedCount } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'finished');

                setStats({
                    subjects: subjectCount || 0,
                    students: studentCount || 0,
                    schools: uniqueSchools || 0,
                    finished: finishedCount || 0
                });
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <div className="p-8 text-center"><Loader className="animate-spin inline mr-2 text-blue-600"/> Memuat data...</div>;

    return (
    <div className="space-y-6 animate-fade-in-up">
      <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
            { label: 'Total Mapel', value: stats.subjects, color: 'bg-blue-500' },
            { label: 'Total Siswa', value: stats.students, color: 'bg-green-500' },
            { label: 'Sekolah', value: stats.schools, color: 'bg-purple-500' },
            { label: 'Selesai Mengerjakan', value: stats.finished, color: 'bg-orange-500' }
        ].map((stat, idx) => (
          <div key={idx} className={`${stat.color} text-white p-6 rounded-lg shadow-lg transform transition hover:scale-105`}>
            <div className="text-3xl font-bold">{stat.value}</div>
            <div className="text-sm opacity-90">{stat.label}</div>
          </div>
        ))}
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
        <h3 className="text-lg font-semibold mb-4">Statistik Kehadiran Peserta</h3>
        <div className="h-64 w-full">
           <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={[
              { name: '07:00', students: 10 },
              { name: '07:30', students: 50 },
              { name: '08:00', students: 200 },
              { name: '08:30', students: 350 },
              { name: '09:00', students: 450 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="students" stroke="#2563eb" fill="#3b82f6" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const LiveMonitoring = () => {
    const [students, setStudents] = useState<Student[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const { data } = await supabase.from('students').select('*').order('name', { ascending: true });
            if (data) {
                const mapped = data.map(s => ({
                    id: s.id,
                    nisn: s.nisn,
                    name: s.name,
                    school: s.school,
                    isLogin: s.is_login,
                    status: s.status
                }));
                setStudents(mapped);
            }
        };
        fetchData();
        const interval = setInterval(fetchData, 10000); 
        return () => clearInterval(interval);
    }, []);

    const resetLogin = async (id: string) => {
        await supabase.from('students').update({ is_login: false, status: 'idle' }).eq('id', id);
        setStudents(prev => prev.map(s => s.id === id ? { ...s, isLogin: false, status: 'idle' } : s));
    };

    const unblock = async (id: string) => {
        await supabase.from('students').update({ status: 'working' }).eq('id', id);
        setStudents(prev => prev.map(s => s.id === id ? { ...s, status: 'working' } : s));
    };

    return (
    <div className="space-y-6 animate-fade-in-up">
      <h2 className="text-2xl font-bold text-gray-800">Live Monitoring</h2>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Peserta</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sekolah</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {students.map((student) => (
              <tr key={student.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.school}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    student.status === 'working' ? 'bg-green-100 text-green-800' : 
                    student.status === 'blocked' ? 'bg-red-100 text-red-800' : 
                    student.status === 'finished' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {student.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                  <button onClick={() => resetLogin(student.id)} className="text-blue-600 hover:text-blue-900 font-medium">Reset Login</button>
                  {student.status === 'blocked' && (
                    <button onClick={() => unblock(student.id)} className="text-red-600 hover:text-red-900 font-bold border border-red-200 px-2 rounded bg-red-50">BUKA BLOKIR</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const HasilUjian = () => {
  const [filterSchool, setFilterSchool] = useState('');
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
      const fetchResults = async () => {
          const { data } = await supabase.from('results').select('*');
          if (data) setResults(data);
      };
      fetchResults();
  }, []);
  
  const filteredResults = results.filter(r => 
    (filterSchool === '' || r.school === filterSchool)
  );

  const handleExport = () => {
    const headers = ["ID", "Nama Peserta", "Sekolah", "Mata Pelajaran", "Nilai", "Timestamp"];
    downloadCSV(headers, 'hasil_ujian.csv');
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <h2 className="text-2xl font-bold text-gray-800">Hasil Ujian</h2>
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
        <select value={filterSchool} onChange={e => setFilterSchool(e.target.value)} className="border p-2 rounded text-sm">
          <option value="">Semua Sekolah</option>
          <option value="SD NEGERI 1 BEJI">SD NEGERI 1 BEJI</option>
        </select>
        <button onClick={handleExport} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center gap-2 shadow-sm">
          <FileText size={18}/> Export CSV
        </button>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
             <tr>
               <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Timestamp</th>
               <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Nama Peserta</th>
               <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Nilai</th>
             </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
             {filteredResults.length === 0 ? (
                 <tr><td colSpan={3} className="text-center py-4 text-gray-500">Belum ada data hasil ujian.</td></tr>
             ) : (
                 filteredResults.map(r => (
                   <tr key={r.id}>
                     <td className="px-6 py-4 text-sm font-mono">{r.timestamp}</td>
                     <td className="px-6 py-4 text-sm font-bold">{r.name}</td>
                     <td className="px-6 py-4 text-center font-bold text-green-600">{r.score}</td>
                   </tr>
                 ))
             )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const BankSoal = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importedQuestions, setImportedQuestions] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  
  // New States for Detail/Edit Mode
  const [viewMode, setViewMode] = useState<'main' | 'detail'>('main');
  const [detailSubject, setDetailSubject] = useState<Subject | null>(null);
  const [dbQuestions, setDbQuestions] = useState<any[]>([]);
  const [loadingDb, setLoadingDb] = useState(false);

  const fetchSubjects = async () => {
      const { data } = await supabase.from('subjects').select('*').order('name');
      if (data) {
          const mapped = data.map(s => ({
              id: s.id,
              name: s.name,
              duration: s.duration,
              questionCount: s.question_count,
              token: s.token
          }));
          setSubjects(mapped);
      }
  };

  useEffect(() => {
      fetchSubjects();
  }, []);

  const handleEditSubject = async (subject: Subject) => {
      setDetailSubject(subject);
      setViewMode('detail');
      setLoadingDb(true);
      
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('subject_id', subject.id);
        
      if (data) {
          // Sort numeric properly if "Nomor" is numeric string
          const sorted = data.sort((a,b) => {
              const numA = parseInt(a['Nomor']);
              const numB = parseInt(b['Nomor']);
              return isNaN(numA) ? a['Nomor'].localeCompare(b['Nomor']) : numA - numB;
          });
          setDbQuestions(sorted);
      }
      setLoadingDb(false);
  };
  
  const handleDeleteQuestion = async (pk: string) => {
      if(!confirm('Yakin hapus soal ini?')) return;
      
      const { error } = await supabase.from('questions').delete().eq('Url Gambar', pk);
      if(!error) {
          setDbQuestions(prev => prev.filter(q => q['Url Gambar'] !== pk));
      } else {
          alert('Gagal hapus: ' + error.message);
      }
  };
  
  const handleDeleteAllQuestions = async () => {
      if(!detailSubject) return;
      if(!confirm(`PERINGATAN: Anda akan menghapus SEMUA soal untuk mapel ${detailSubject.name}. Tindakan ini tidak dapat dibatalkan.`)) return;
      
      const { error } = await supabase.from('questions').delete().eq('subject_id', detailSubject.id);
      if(!error) {
          setDbQuestions([]);
          alert('Semua soal berhasil dihapus.');
      } else {
          alert('Gagal hapus: ' + error.message);
      }
  };
  
  const handleDownloadTemplate = () => {
    // Generate valid Excel file using SheetJS
    const headers = [
        { 
            "Nomor": 1, 
            "Tipe Soal": "PILIHAN GANDA", 
            "Jenis Soal": "UMUM", 
            "Soal": "Contoh Soal: Ibukota Indonesia adalah?", 
            "Url Gambar": "", 
            "Opsi A": "Jakarta", 
            "Opsi B": "Bandung", 
            "Opsi C": "Surabaya", 
            "Opsi D": "Medan", 
            "Kunci": "A", 
            "Bobot": 1 
        }
    ];
    const ws = XLSX.utils.json_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "template_soal_v2.xlsx");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
       const reader = new FileReader();
       reader.onload = (event) => {
         const data = new Uint8Array(event.target?.result as ArrayBuffer);
         const workbook = XLSX.read(data, { type: 'array' });
         const sheetName = workbook.SheetNames[0];
         const worksheet = workbook.Sheets[sheetName];
         const json = XLSX.utils.sheet_to_json(worksheet);
         
         // Ensure numbers are converted to strings if needed for the display/logic
         const cleanData = json.map((row: any) => ({
             ...row,
             "Nomor": (row["Nomor"] || '').toString(),
             "Bobot": (row["Bobot"] || '1').toString()
         }));

         setImportedQuestions(cleanData);
         setShowPreview(true);
       };
       reader.readAsArrayBuffer(file);
    }
  };

  const saveQuestions = async () => {
      if (!selectedSubjectId) {
          alert('Pilih Mata Pelajaran Terlebih Dahulu!');
          return;
      }
      setIsSaving(true);

      // Validate and Transform
      const dbQuestions = [];
      const invalidRows = [];

      for (let i = 0; i < importedQuestions.length; i++) {
          const q = importedQuestions[i];
          
          const text = q['Soal'] || '';
          const key = (q['Kunci'] || '').toString().trim().toUpperCase();
          const validKey = ['A', 'B', 'C', 'D'].includes(key);
          
          if (!text || !validKey) {
              invalidRows.push(q['Nomor'] || (i+1));
              continue;
          }

          // Generate dummy URL for PK if missing, to avoid Null Constraint Violation
          // Using Timestamp + Index to ensure uniqueness in batch
          const imgUrl = q['Url Gambar'] && q['Url Gambar'].toString().trim() !== '' 
              ? q['Url Gambar'] 
              : `auto-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`;

          dbQuestions.push({
              subject_id: selectedSubjectId,
              "Nomor": (q['Nomor'] || (i+1)).toString(),
              "Tipe Soal": [q['Tipe Soal'] || 'PILIHAN GANDA'], // Cast to Array as per schema
              "Jenis Soal": q['Jenis Soal'] || 'UMUM',
              "Soal": text,
              "Opsi A": (q['Opsi A'] || '').toString(),
              "Opsi B": (q['Opsi B'] || '').toString(),
              "Opsi C": (q['Opsi C'] || '').toString(),
              "Opsi D": (q['Opsi D'] || '').toString(),
              "Kunci": key,
              "Bobot": (q['Bobot'] || '1').toString(),
              "Url Gambar": imgUrl // Primary Key
          });
      }

      if (dbQuestions.length === 0) {
          alert('Tidak ada data soal valid yang dapat disimpan. Periksa format Excel.');
          setIsSaving(false);
          return;
      }

      const { error } = await supabase.from('questions').insert(dbQuestions);
      setIsSaving(false);
      
      if (error) {
          console.error("Supabase Error:", error);
          if (error.code === '23503') {
             // Foreign Key Violation
             alert("GAGAL MENYIMPAN: Mata Pelajaran Tidak Valid.\n\nHal ini terjadi karena ID Mapel yang Anda pilih sudah tidak ada di database (mungkin database baru saja di-reset). \n\nSOLUSI: Klik tombol Refresh kecil di samping pilihan mapel, lalu pilih ulang mapel tersebut.");
          } else {
             alert('Gagal menyimpan: ' + error.message);
          }
      } else {
          // Update question count in subjects table (optional logic)
          // await supabase.rpc('increment_question_count', { row_id: selectedSubjectId, count: dbQuestions.length });
          
          let msg = `Berhasil menyimpan ${dbQuestions.length} soal!`;
          if (invalidRows.length > 0) {
              msg += `\n${invalidRows.length} soal dilewati karena data tidak lengkap (Nomor: ${invalidRows.slice(0, 5).join(', ')}...)`;
          }
          alert(msg);
          setShowPreview(false);
          setImportedQuestions([]);
          // If viewing details of same subject, refresh
          if(detailSubject && detailSubject.id === selectedSubjectId) {
              handleEditSubject(detailSubject);
          }
      }
  };

  // --- DETAIL VIEW ---
  if (viewMode === 'detail' && detailSubject) {
      return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => setViewMode('main')} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><ArrowLeft/></button>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Detail Bank Soal</h2>
                        <div className="text-sm text-gray-500">{detailSubject.name} • {dbQuestions.length} Soal Tersimpan</div>
                    </div>
                </div>
                <button onClick={handleDeleteAllQuestions} className="bg-red-100 text-red-600 px-4 py-2 rounded font-bold hover:bg-red-200 flex items-center gap-2">
                    <Trash2 size={18}/> HAPUS SEMUA SOAL
                </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                {loadingDb ? (
                    <div className="p-8 text-center text-gray-500"><Loader className="animate-spin inline mr-2"/> Memuat data soal...</div>
                ) : dbQuestions.length === 0 ? (
                     <div className="p-12 text-center">
                         <Database className="mx-auto h-12 w-12 text-gray-300 mb-4"/>
                         <h3 className="text-lg font-medium text-gray-900">Belum ada soal</h3>
                         <p className="text-gray-500 mb-6">Silahkan kembali dan gunakan fitur Import Excel untuk menambahkan soal.</p>
                         <button onClick={() => setViewMode('main')} className="bg-blue-600 text-white px-6 py-2 rounded">Kembali ke Import</button>
                     </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left font-bold text-gray-500 uppercase">No</th>
                                    <th className="px-6 py-3 text-left font-bold text-gray-500 uppercase">Soal</th>
                                    <th className="px-6 py-3 text-left font-bold text-gray-500 uppercase">Kunci</th>
                                    <th className="px-6 py-3 text-left font-bold text-gray-500 uppercase">Tipe</th>
                                    <th className="px-6 py-3 text-center font-bold text-gray-500 uppercase">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {dbQuestions.map((q) => (
                                    <tr key={q['Url Gambar']}>
                                        <td className="px-6 py-4 whitespace-nowrap font-medium">{q['Nomor']}</td>
                                        <td className="px-6 py-4 max-w-lg truncate" title={q['Soal']}>{q['Soal']}</td>
                                        <td className="px-6 py-4 font-bold text-green-600">{q['Kunci']}</td>
                                        <td className="px-6 py-4 text-xs text-gray-500">{Array.isArray(q['Tipe Soal']) ? q['Tipe Soal'].join(', ') : q['Tipe Soal']}</td>
                                        <td className="px-6 py-4 text-center">
                                            <button onClick={() => handleDeleteQuestion(q['Url Gambar'])} className="text-red-500 hover:text-red-700 p-2"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
      )
  }

  // --- MAIN VIEW ---
  return (
    <div className="space-y-6 animate-fade-in-up">
      <h2 className="text-2xl font-bold text-gray-800">Bank Soal</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {subjects.map(s => (
          <div key={s.id} className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500 flex justify-between items-center transform transition hover:scale-[1.01]">
             <div>
               <h3 className="text-xl font-bold text-gray-800 mb-1">{s.name}</h3>
               <div className="text-sm text-gray-500 flex items-center gap-2">
                   <Clock size={14}/> {s.duration} Menit
               </div>
             </div>
             <div className="flex flex-col gap-2">
                <button onClick={() => handleEditSubject(s)} className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded text-sm font-bold hover:bg-blue-200 flex items-center gap-1">
                    <Edit size={14}/> Kelola Soal
                </button>
             </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-lg shadow mt-6 border border-gray-100">
         <div className="flex items-center gap-2 mb-6 border-b pb-4">
             <div className="bg-green-100 p-2 rounded text-green-700"><Upload size={24}/></div>
             <div>
                 <h3 className="font-bold text-lg text-gray-800">Import Soal (Excel)</h3>
                 <p className="text-xs text-gray-500">Gunakan template yang disediakan agar import berhasil.</p>
             </div>
         </div>
         
         <div className="bg-gray-50 p-4 rounded border border-gray-200 mb-6">
             <label className="block text-sm font-bold text-gray-700 mb-2">1. Pilih Mapel Tujuan Import:</label>
             <div className="flex gap-2 md:w-1/3">
                 <select 
                    className="border p-2 rounded w-full focus:ring-2 focus:ring-green-500 outline-none bg-white"
                    value={selectedSubjectId} 
                    onChange={e => setSelectedSubjectId(e.target.value)}
                 >
                     <option value="">-- Pilih Mapel --</option>
                     {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                 </select>
                 <button 
                    onClick={fetchSubjects} 
                    className="bg-white p-2 rounded border hover:bg-gray-100 text-gray-600"
                    title="Refresh Data Mapel"
                 >
                    <RefreshCw size={18} />
                 </button>
             </div>
             <p className="text-xs text-red-500 mt-1 italic">*Wajib pilih mapel sebelum upload file.</p>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                 <label className="block text-sm font-bold text-gray-700 mb-2">2. Download Template</label>
                 <button onClick={handleDownloadTemplate} className="w-full flex items-center justify-center gap-2 bg-gray-700 text-white px-4 py-3 rounded shadow hover:bg-gray-800 transition">
                   <Download size={18} /> Download Template (XLSX)
                 </button>
            </div>
            <div>
                 <label className="block text-sm font-bold text-gray-700 mb-2">3. Upload File Excel</label>
                 <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx, .xls, .csv" className="hidden" />
                 <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-3 rounded shadow hover:bg-green-700 transition">
                    <Upload size={18} /> Pilih File & Import
                 </button>
            </div>
         </div>
         
         {importedQuestions.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 rounded border border-blue-100 flex justify-between items-center animate-pulse">
                <span className="text-blue-800 font-bold">{importedQuestions.length} Soal berhasil dibaca dari file!</span>
                <button onClick={() => setShowPreview(true)} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700">
                    <Eye size={18} /> Preview & Simpan
                </button>
            </div>
         )}
      </div>

      <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} title="Preview Soal Terimport">
          <div className="overflow-x-auto max-h-[60vh]">
             <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-100 sticky top-0">
                    <tr>
                        <th className="px-2 py-2 border">No</th>
                        <th className="px-2 py-2 border">Soal</th>
                        <th className="px-2 py-2 border">Opsi A</th>
                        <th className="px-2 py-2 border">Opsi B</th>
                        <th className="px-2 py-2 border">Opsi C</th>
                        <th className="px-2 py-2 border">Opsi D</th>
                        <th className="px-2 py-2 border">Kunci</th>
                        <th className="px-2 py-2 border">Gambar (PK)</th>
                        <th className="px-2 py-2 border">Status</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {importedQuestions.map((q, idx) => {
                        const isValid = q['Soal'] && ['A','B','C','D'].includes((q['Kunci']||'').toString().trim().toUpperCase());
                        return (
                        <tr key={idx} className={isValid ? '' : 'bg-red-50'}>
                            <td className="px-2 py-2 border">{q['Nomor'] || idx + 1}</td>
                            <td className="px-2 py-2 border truncate max-w-xs" title={q['Soal']}>{q['Soal']}</td>
                            <td className="px-2 py-2 border">{q['Opsi A']}</td>
                            <td className="px-2 py-2 border">{q['Opsi B']}</td>
                            <td className="px-2 py-2 border">{q['Opsi C']}</td>
                            <td className="px-2 py-2 border">{q['Opsi D']}</td>
                            <td className="px-2 py-2 border font-bold text-center">{q['Kunci']}</td>
                            <td className="px-2 py-2 border truncate max-w-[100px] text-gray-400">{q['Url Gambar'] || '(Auto-Generated)'}</td>
                            <td className="px-2 py-2 border text-center">
                                {isValid ? <span className="text-green-600 font-bold">OK</span> : <span className="text-red-600 font-bold">INVALID</span>}
                            </td>
                        </tr>
                    )})}
                </tbody>
             </table>
          </div>
          <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowPreview(false)} className="bg-gray-500 text-white px-6 py-2 rounded font-bold hover:bg-gray-600">BATAL</button>
              <button onClick={saveQuestions} disabled={isSaving} className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 disabled:opacity-50">
                  {isSaving ? 'MENYIMPAN KE DATABASE...' : 'SIMPAN SEMUA'}
              </button>
          </div>
      </Modal>
    </div>
  );
};

const JadwalMapel = () => {
    const [selectedSchedule, setSelectedSchedule] = useState('Sesi 1 - Senin');
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [schools, setSchools] = useState<string[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            // Fetch Subjects
            const { data: subData } = await supabase.from('subjects').select('*');
            if(subData) {
                setSubjects(subData.map(s => ({...s, questionCount: s.question_count})));
            }
            
            // Fetch Unique Schools from Students table for Mapping
            const { data: schoolData } = await supabase.from('students').select('school');
            if (schoolData) {
                const uniqueSchools = Array.from(new Set(schoolData.map((d: any) => d.school))).sort() as string[];
                setSchools(uniqueSchools);
            }
        }
        fetchData();
    }, []);

    return (
        <div className="space-y-6 animate-fade-in-up">
            <h2 className="text-2xl font-bold text-gray-800">Pengaturan Jadwal & Mapping</h2>
            
            <div className="flex flex-col lg:flex-row gap-6">
                <div className="lg:w-1/3 space-y-4">
                    <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-blue-600">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-700">
                            <CalendarClock size={20}/> Tambah Jadwal Ujian
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Sesi / Jadwal</label>
                                <input type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="Contoh: Sesi 1 - Senin" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Mulai</label>
                                    <input type="datetime-local" className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Selesai</label>
                                    <input type="datetime-local" className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mata Pelajaran</label>
                                <select className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                    {subjects.map(s => <option key={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Token (Otomatis)</label>
                                <input type="text" disabled value="X7F9A2" className="w-full border p-2 rounded bg-gray-100 font-mono text-center tracking-widest" />
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                                <input type="checkbox" id="active" className="rounded w-4 h-4 text-blue-600" />
                                <label htmlFor="active" className="text-sm text-gray-700">Aktifkan Jadwal Segera</label>
                            </div>
                            <button className="w-full bg-blue-600 text-white py-2.5 rounded hover:bg-blue-700 font-medium shadow transition-transform active:scale-95">
                                Simpan Jadwal
                            </button>
                        </div>
                    </div>
                </div>

                <div className="lg:w-2/3 bg-white p-6 rounded-lg shadow-md border-t-4 border-orange-500">
                    <div className="flex justify-between items-center mb-6 border-b pb-4">
                        <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                             <Database size={20}/> Mapping Sekolah
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-500">Pilih Jadwal:</span>
                            <select 
                                className="border p-1.5 rounded text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={selectedSchedule}
                                onChange={(e) => setSelectedSchedule(e.target.value)}
                            >
                                <option>Sesi 1 - Senin</option>
                                <option>Sesi 2 - Senin</option>
                                <option>Sesi 1 - Selasa</option>
                            </select>
                        </div>
                    </div>

                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded-r">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-yellow-700">
                                    Sekolah yang dicentang akan dapat mengakses ujian pada: <strong>{selectedSchedule}</strong>.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {schools.length === 0 ? (
                            <p className="text-center text-gray-400 italic py-4">Belum ada data sekolah yang terdaftar.</p>
                        ) : schools.map((school, idx) => (
                            <label key={idx} className="flex items-center p-3 border rounded-lg hover:bg-blue-50 cursor-pointer transition-colors group">
                                <input type="checkbox" className="h-5 w-5 text-blue-600 rounded mr-4 focus:ring-blue-500" defaultChecked={true} />
                                <div className="flex-1">
                                    <div className="font-bold text-gray-800 group-hover:text-blue-700">{school}</div>
                                    <div className="text-xs text-gray-500 flex items-center gap-1">
                                        <Users size={12}/> Peserta Terdaftar
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded border border-green-200">TERDAFTAR</span>
                            </label>
                        ))}
                    </div>

                    <div className="mt-6 pt-4 border-t flex justify-end">
                        <button className="bg-green-600 text-white px-6 py-2.5 rounded hover:bg-green-700 flex items-center gap-2 shadow font-bold transition-colors">
                            <Save size={18} /> Simpan Konfigurasi Mapping
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const DataPeserta = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
     fetchStudents();
  }, []);

  const fetchStudents = async () => {
      const { data } = await supabase.from('students').select('*').order('name');
      if (data) {
          setStudents(data.map(s => ({
              id: s.id,
              nisn: s.nisn,
              name: s.name,
              school: s.school,
              password: s.password,
              isLogin: s.is_login,
              status: s.status
          })));
      }
  };

  const handleDownloadTemplate = () => {
     const headers = ['NAMA SISWA', 'NISN / Username', 'Password', 'Sekolah'];
     downloadCSV(headers, 'template_siswa_v2.csv');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
       const reader = new FileReader();
       reader.onload = async (event) => {
         const text = event.target?.result as string;
         const parsedData = parseCSV(text);
         const dbData = parsedData.map((d: any) => ({
             nisn: d['NISN / Username'] || d['NISN'] || '00',
             name: d['NAMA SISWA'] || 'SISWA',
             school: d['Sekolah'] || '-',
             password: d['Password'] || '12345',
             is_login: false,
             status: 'idle'
         }));
         
         const { error } = await supabase.from('students').insert(dbData);
         if(error) {
             alert("Error Import: " + error.message);
         } else {
             alert("Berhasil import data siswa!");
             fetchStudents();
         }
       };
       reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <h2 className="text-2xl font-bold text-gray-800">Data Peserta</h2>
      <div className="flex gap-4 mb-4">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="bg-green-600 text-white px-4 py-2 rounded shadow">Import CSV & Simpan</button>
            <button onClick={handleDownloadTemplate} className="bg-gray-600 text-white px-4 py-2 rounded shadow">Download Template</button>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
           <thead className="bg-gray-50">
             <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">NAMA SISWA</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">NISN / Username</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Password</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Sekolah</th>
             </tr>
           </thead>
           <tbody className="bg-white divide-y divide-gray-200">
              {students.map((s, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-bold">{s.name}</td>
                    <td className="px-6 py-4 text-sm font-mono">{s.nisn}</td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-500">{s.password || '******'}</td>
                    <td className="px-6 py-4 text-sm">{s.school}</td>
                  </tr>
              ))}
           </tbody>
        </table>
      </div>
    </div>
  )
};

const CetakKartu = () => {
    const [filterSchool, setFilterSchool] = useState('Semua Sekolah');
    const [students, setStudents] = useState<Student[]>([]);
    const [schools, setSchools] = useState<string[]>([]);

    useEffect(() => {
        const fetchStudents = async () => {
            const { data } = await supabase.from('students').select('*').order('name');
            if(data) {
                setStudents(data.map(s => ({...s, isLogin: s.is_login})));
                // Extract Unique Schools from Students with strict typing
                const uniqueSchools = Array.from(new Set(data.map((item: any) => item.school)))
                   .filter((s): s is string => typeof s === 'string' && s.length > 0)
                   .sort();
                setSchools(uniqueSchools);
            }
        };
        fetchStudents();
    }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
       <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-blue-600 print:hidden">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><Printer/> Filter Cetak Kartu</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
             <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Pilih Sekolah</label>
                <select 
                    value={filterSchool}
                    onChange={(e) => setFilterSchool(e.target.value)}
                    className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="Semua Sekolah">Semua Sekolah</option>
                  {schools.map((sch, idx) => (
                      <option key={idx} value={sch}>{sch}</option>
                  ))}
                </select>
             </div>
             <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Tanggal Cetak</label>
                <input type="date" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" defaultValue={new Date().toISOString().split('T')[0]} />
             </div>
             <div>
                <button onClick={handlePrint} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-bold flex items-center justify-center gap-2 shadow-lg transition-colors">
                   <Printer size={18}/> PREVIEW & CETAK
                </button>
             </div>
          </div>
       </div>

       <div className="bg-gray-200 p-8 rounded-lg shadow-inner overflow-x-auto print:bg-white print:p-0 print:overflow-visible print:shadow-none">
          <div className="print:hidden text-center text-gray-500 mb-4 font-medium italic">--- Preview Tampilan Kartu ---</div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-4 print:w-full">
             {students.filter(s => filterSchool === 'Semua Sekolah' || s.school === filterSchool).map((student, id) => (
                <div key={id} className="bg-white border-2 border-gray-400 p-4 flex gap-4 relative print:break-inside-avoid print:border-2 print:border-gray-800 print:mb-4 page-break-inside-avoid">
                   <div className="w-24 flex flex-col items-center justify-center border-r-2 border-gray-200 pr-4">
                      <img src={localStorage.getItem('logoUrl') || LOGO_URL} className="w-16 h-16 mb-2 object-contain" alt="Logo"/>
                      <div className="text-[10px] font-bold text-center leading-tight uppercase text-blue-900">K3S BEJI 2026<br/>{localStorage.getItem('appName') || 'TKA MANDIRI'}</div>
                   </div>
                   <div className="flex-1 text-sm space-y-1">
                      <div className="font-bold text-lg border-b-2 border-gray-800 pb-1 mb-2 text-center uppercase tracking-wider">KARTU PESERTA UJIAN</div>
                      
                      <div className="grid grid-cols-3 gap-1">
                         <span className="text-gray-600 font-medium">Nama Peserta</span>
                         <span className="col-span-2 font-bold uppercase">: {student.name}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                         <span className="text-gray-600 font-medium">NISN</span>
                         <span className="col-span-2 font-mono font-bold">: {student.nisn}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                         <span className="text-gray-600 font-medium">Sekolah</span>
                         <span className="col-span-2 uppercase">: {student.school}</span>
                      </div>
                      
                      <div className="mt-3 pt-2 border-t border-dashed border-gray-400 bg-gray-50 p-2 rounded print:bg-transparent print:p-0 print:rounded-none">
                         <div className="grid grid-cols-3 gap-1">
                             <span className="font-bold text-blue-800 print:text-black">Username</span>
                             <span className="col-span-2 font-mono font-bold">: {student.nisn}</span>
                         </div>
                         <div className="grid grid-cols-3 gap-1">
                             <span className="font-bold text-blue-800 print:text-black">Password</span>
                             <span className="col-span-2 font-mono font-bold">: {student.password || '12345'}</span>
                         </div>
                      </div>
                   </div>
                   
                   <div className="absolute bottom-2 right-2 text-[8px] text-gray-400 print:text-black">
                       Dicetak: {new Date().toLocaleDateString()}
                   </div>
                </div>
             ))}
          </div>
       </div>
    </div>
  )
};

// --- SETTINGS COMPONENT ---
const Settings = () => {
  const [config, setConfig] = useState({
    appName: localStorage.getItem('appName') || 'TKA MANDIRI',
    logoUrl: localStorage.getItem('logoUrl') || LOGO_URL,
    themeColor: localStorage.getItem('themeColor') || '#2563eb',
    antiCheat: {
      enabled: localStorage.getItem('ac_enabled') === 'false' ? false : true,
      freezeDuration: parseInt(localStorage.getItem('ac_freeze') || '15'),
      maxViolations: parseInt(localStorage.getItem('ac_max') || '3'),
      warningMessage: localStorage.getItem('ac_msg') || 'Dilarang membuka tab lain atau keluar dari mode fullscreen!',
    }
  });

  const handleSave = () => {
    localStorage.setItem('appName', config.appName);
    localStorage.setItem('logoUrl', config.logoUrl);
    localStorage.setItem('themeColor', config.themeColor);
    localStorage.setItem('ac_enabled', String(config.antiCheat.enabled));
    localStorage.setItem('ac_freeze', String(config.antiCheat.freezeDuration));
    localStorage.setItem('ac_max', String(config.antiCheat.maxViolations));
    localStorage.setItem('ac_msg', config.antiCheat.warningMessage);
    alert('Pengaturan berhasil disimpan!');
    window.location.reload(); 
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
       <h2 className="text-2xl font-bold text-gray-800">Pengaturan Sistem</h2>
       
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-blue-600">
             <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><SettingsIcon size={20}/> Identitas Aplikasi</h3>
             <div className="space-y-4">
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Nama Aplikasi / Sekolah</label>
                   <input 
                     type="text" 
                     value={config.appName}
                     onChange={(e) => setConfig({...config, appName: e.target.value})}
                     className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">URL Logo</label>
                   <div className="flex gap-2">
                     <input 
                       type="text" 
                       value={config.logoUrl}
                       onChange={(e) => setConfig({...config, logoUrl: e.target.value})}
                       className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                     />
                     <img src={config.logoUrl} alt="Preview" className="w-10 h-10 object-contain bg-gray-100 rounded border" />
                   </div>
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Warna Tema Utama</label>
                   <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={config.themeColor}
                        onChange={(e) => setConfig({...config, themeColor: e.target.value})}
                        className="h-10 w-20 border rounded cursor-pointer" 
                      />
                      <span className="text-sm text-gray-500">{config.themeColor}</span>
                   </div>
                </div>
             </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-red-600">
             <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><ShieldAlert size={20}/> Keamanan & Anti-Curang</h3>
             <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                   <span className="font-medium text-gray-700">Aktifkan Proteksi Ujian</span>
                   <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={config.antiCheat.enabled}
                        onChange={(e) => setConfig({...config, antiCheat: {...config.antiCheat, enabled: e.target.checked}})}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                   </label>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Durasi Beku Awal (Detik)</label>
                      <input 
                        type="number" 
                        value={config.antiCheat.freezeDuration}
                        onChange={(e) => setConfig({...config, antiCheat: {...config.antiCheat, freezeDuration: parseInt(e.target.value)}})}
                        className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                      />
                      <p className="text-xs text-gray-500 mt-1">Waktu = Durasi x Pelanggaran</p>
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Maks. Pelanggaran</label>
                      <input 
                        type="number" 
                        value={config.antiCheat.maxViolations}
                        onChange={(e) => setConfig({...config, antiCheat: {...config.antiCheat, maxViolations: parseInt(e.target.value)}})}
                        className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                      />
                      <p className="text-xs text-gray-500 mt-1">Blokir setelah X kali.</p>
                   </div>
                </div>

                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Pesan Peringatan</label>
                   <textarea 
                      value={config.antiCheat.warningMessage}
                      onChange={(e) => setConfig({...config, antiCheat: {...config.antiCheat, warningMessage: e.target.value}})}
                      className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm h-20"
                   ></textarea>
                </div>
             </div>
          </div>
       </div>
       
       <div className="flex justify-end pt-4">
          <button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded shadow-lg flex items-center gap-2 transition-transform active:scale-95">
             <Save size={20}/> SIMPAN PENGATURAN
          </button>
       </div>
    </div>
  );
}

// --- STUDENT PANEL COMPONENTS ---

const StudentDashboard = () => {
    const navigate = useNavigate();
    const [subjects, setSubjects] = useState<Subject[]>([]);

    useEffect(() => {
        const fetchSubjects = async () => {
            const { data } = await supabase.from('subjects').select('*');
            if (data) {
                setSubjects(data.map(s => ({
                    id: s.id,
                    name: s.name,
                    duration: s.duration,
                    questionCount: s.question_count,
                    token: s.token
                })));
            }
        };
        fetchSubjects();
    }, []);

  const handleSelectSubject = (sub: Subject) => {
    localStorage.setItem('selectedSubject', JSON.stringify(sub));
    navigate('/student/confirmation');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-10 animate-fade-in-up">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-2xl text-center border-t-4 border-blue-500">
         <div className="mb-6 flex justify-center">
            <div className="bg-blue-100 p-4 rounded-full">
              <BookOpen size={48} className="text-blue-600" />
            </div>
         </div>
         <h2 className="text-2xl font-bold text-gray-800 mb-2">Simulasi TKA</h2>
         <p className="text-gray-500 mb-8">Pilih jenjang dan mata pelajaran untuk memulai simulasi</p>
         
         <div className="space-y-4 text-left">
           <div>
             <label className="block font-bold text-gray-700 mb-2 flex items-center gap-2"><Database size={16}/> Jenjang Pendidikan:</label>
             <div className="w-full p-4 border rounded-lg bg-gray-50 text-gray-700 font-medium">SD/MI/Sederajat</div>
           </div>
           
           <div>
             <label className="block font-bold text-gray-700 mb-2 flex items-center gap-2"><FileText size={16}/> Mata Pelajaran:</label>
             <div className="grid grid-cols-1 gap-4">
                {subjects.length === 0 ? <p className="text-center text-gray-400 p-4">Belum ada mata pelajaran tersedia.</p> : subjects.map(sub => (
                  <button 
                    key={sub.id}
                    onClick={() => handleSelectSubject(sub)}
                    className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
                  >
                    <span className="font-semibold text-gray-700 group-hover:text-blue-700">{sub.name}</span>
                    <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">MULAI</span>
                  </button>
                ))}
             </div>
           </div>
         </div>
      </div>
    </div>
  );
};

const ExamConfirmation = () => {
    const navigate = useNavigate();
  const [student, setStudent] = useState<any>({});
  const [subject, setSubject] = useState<Subject | null>(null);
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const s = localStorage.getItem('studentData');
    const sub = localStorage.getItem('selectedSubject');
    if (s) setStudent(JSON.parse(s));
    if (sub) setSubject(JSON.parse(sub));
  }, []);

  const handleSubmit = () => {
    if (subject && token.toUpperCase() === subject.token) {
      navigate('/student/review');
    } else {
      setError('Token salah! Silahkan hubungi proktor.');
    }
  };

  if (!subject) return <div>Loading...</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-10 px-4 animate-fade-in-up">
      <div className="flex w-full max-w-4xl bg-white rounded-xl shadow-xl overflow-hidden min-h-[400px]">
        {/* Left Side (Status) */}
        <div className="w-1/3 bg-blue-600 p-8 text-white hidden md:block relative overflow-hidden">
           <div className="relative z-10">
             <h3 className="text-xl font-bold mb-4">Token Ujian</h3>
             <div className="bg-white/20 p-4 rounded mb-4 backdrop-blur-sm">
               <p className="text-xs opacity-75">Token : {subject.token}</p>
             </div>
             <p className="text-xs opacity-70">Masukkan token yang diberikan oleh pengawas.</p>
           </div>
        </div>

        {/* Right Side (Form) */}
        <div className="flex-1 p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Konfirmasi Data Peserta</h2>
          <div className="space-y-4 text-sm">
             <div className="grid grid-cols-3 gap-4 items-center">
               <label className="font-bold text-gray-700">Kode NISN</label>
               <div className="col-span-2 p-2 bg-gray-100 rounded text-gray-600 font-mono">{student.nisn}</div>
             </div>
             <div className="grid grid-cols-3 gap-4 items-center">
               <label className="font-bold text-gray-700">Nama Peserta</label>
               <div className="col-span-2 p-2 bg-gray-100 rounded text-gray-600 font-bold">{student.name}</div>
             </div>
             <div className="grid grid-cols-3 gap-4 items-center">
               <label className="font-bold text-gray-700">Mata Ujian</label>
               <div className="col-span-2 p-2 bg-gray-100 rounded text-gray-600">{subject.name}</div>
             </div>
             
             <div className="grid grid-cols-3 gap-4 items-center">
               <label className="font-bold text-gray-700">Token</label>
               <div className="col-span-2">
                 <input 
                   type="text" 
                   value={token}
                   onChange={(e) => {setToken(e.target.value); setError('');}}
                   placeholder="Ketikkan token di sini"
                   className="w-full border p-2 rounded uppercase tracking-widest focus:ring-2 focus:ring-blue-500 outline-none"
                 />
                 {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
               </div>
             </div>
          </div>
          <div className="mt-8">
            <button onClick={handleSubmit} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded transition-colors shadow-lg">SUBMIT</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ExamReview = () => {
    const navigate = useNavigate();
  const [subject, setSubject] = useState<Subject | null>(null);

  useEffect(() => {
    const sub = localStorage.getItem('selectedSubject');
    if (sub) setSubject(JSON.parse(sub));
  }, []);

  const handleStart = () => {
    document.documentElement.requestFullscreen().catch((e) => console.log(e));
    navigate('/student/exam');
  };

  if(!subject) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-10 px-4 relative animate-fade-in-up">
       <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-lg z-10 border-t-4 border-green-500">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Konfirmasi Tes</h2>
          <div className="space-y-4 mb-8">
             <div><div className="text-xs font-bold text-gray-500 uppercase">Nama Tes</div><div className="text-lg font-medium border-b pb-1">{subject.name}</div></div>
             <div><div className="text-xs font-bold text-gray-500 uppercase">Alokasi Waktu</div><div className="text-lg font-medium border-b pb-1">{subject.duration} Menit</div></div>
          </div>
          <button onClick={handleStart} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-full transition-colors shadow-lg">MULAI</button>
       </div>
    </div>
  );
};

interface ShuffledQuestion extends Question {
    shuffledOptions: { text: string; originalIndex: number }[];
}

const ExamInterface = () => {
  const navigate = useNavigate();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [questions, setQuestions] = useState<ShuffledQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<{[key: number]: number}>({}); 
  const [timeLeft, setTimeLeft] = useState(0);
  const [showList, setShowList] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Anti-cheat States
  const [violationCount, setViolationCount] = useState(0);
  const [isFrozen, setIsFrozen] = useState(false);
  const [freezeTimer, setFreezeTimer] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);

  // Config values
  const acEnabled = localStorage.getItem('ac_enabled') !== 'false';
  const freezeDuration = parseInt(localStorage.getItem('ac_freeze') || '15');
  const maxViolations = parseInt(localStorage.getItem('ac_max') || '3');
  const warningMsg = localStorage.getItem('ac_msg') || 'Dilarang membuka tab lain atau keluar dari mode fullscreen!';

  const finishTest = async () => {
    let correct = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correctAnswer) correct++;
    });
    const score = (correct / questions.length) * 100;
    localStorage.setItem('examScore', score.toString());
    
    if(subject) {
        const student = JSON.parse(localStorage.getItem('studentData') || '{}');
        if(student.id) {
            await supabase.from('students').update({ status: 'finished' }).eq('id', student.id);
        }
    }

    document.exitFullscreen().catch(e => console.log(e));
    navigate('/student/result');
  };

  useEffect(() => {
    const initExam = async () => {
        const sub = localStorage.getItem('selectedSubject');
        if (sub) {
            const parsedSub = JSON.parse(sub);
            setSubject(parsedSub);
            setTimeLeft(parsedSub.duration * 60);

            const { data, error } = await supabase
                .from('questions')
                .select('*')
                .eq('subject_id', parsedSub.id);

            if (data && data.length > 0) {
                let preparedQuestions = data.map((q: any) => {
                    // Map from specific Table columns to Internal Interface
                    const text = q['Soal'];
                    const options = [q['Opsi A'], q['Opsi B'], q['Opsi C'], q['Opsi D']];
                    const correctKey = (q['Kunci'] || 'A').toUpperCase();
                    const correctAnswerIndex = ['A', 'B', 'C', 'D'].indexOf(correctKey);
                    
                    const optionsWithIndex = options.map((opt: string, i: number) => ({ text: opt, originalIndex: i }));
                    // Shuffle Options
                    for (let i = optionsWithIndex.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [optionsWithIndex[i], optionsWithIndex[j]] = [optionsWithIndex[j], optionsWithIndex[i]];
                    }
                    return { 
                        id: q.id, // Using the UUID as ID
                        text: text,
                        options: options,
                        correctAnswer: correctAnswerIndex,
                        type: 'pilihan_ganda' as const, // Strict type casting
                        imgUrl: q['Url Gambar'] && !q['Url Gambar'].startsWith('no-image') && !q['Url Gambar'].startsWith('auto-') ? q['Url Gambar'] : null,
                        shuffledOptions: optionsWithIndex 
                    };
                });

                // Shuffle Questions
                for (let i = preparedQuestions.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [preparedQuestions[i], preparedQuestions[j]] = [preparedQuestions[j], preparedQuestions[i]];
                }
                
                setQuestions(preparedQuestions);
            } else {
                alert('Gagal memuat soal atau soal kosong.');
            }
            setLoading(false);
        }
    };
    initExam();
  }, []);

  // Timer Effect
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          finishTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Anti-cheat Logic
  useEffect(() => {
    if (!acEnabled || isBlocked) return;

    const handleViolation = () => {
        if (isFrozen) return;

        setViolationCount(prev => {
            const next = prev + 1;
            if (next >= maxViolations) {
                setIsBlocked(true);
                const student = JSON.parse(localStorage.getItem('studentData') || '{}');
                if(student.id) supabase.from('students').update({ status: 'blocked' }).eq('id', student.id);
            } else {
                 setIsFrozen(true);
                 setFreezeTimer(freezeDuration * next); 
            }
            return next;
        });
    };

    const onVisibilityChange = () => {
        if (document.hidden) handleViolation();
    };

    const onBlur = () => {
        handleViolation();
    };

    const onContextMenu = (e: MouseEvent) => {
        e.preventDefault();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    document.addEventListener("contextmenu", onContextMenu);
    
    document.documentElement.requestFullscreen().catch(() => {});

    return () => {
        document.removeEventListener("visibilitychange", onVisibilityChange);
        window.removeEventListener("blur", onBlur);
        document.removeEventListener("contextmenu", onContextMenu);
    };
  }, [acEnabled, isFrozen, freezeDuration, maxViolations, isBlocked]);

  // Freeze Timer Effect
  useEffect(() => {
    if (!isFrozen || freezeTimer <= 0) {
        if (isFrozen && freezeTimer <= 0) setIsFrozen(false);
        return;
    }
    const timer = setInterval(() => {
        setFreezeTimer(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isFrozen, freezeTimer]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAnswer = (originalIndex: number) => {
    if (questions.length === 0) return;
    setAnswers(prev => ({...prev, [questions[currentQIndex].id]: originalIndex}));
  };

  if (isBlocked) {
      return (
        <div className="fixed inset-0 z-50 bg-red-800 text-white flex flex-col items-center justify-center text-center p-8 animate-fade-in-up">
            <ShieldAlert size={120} className="mb-6 text-red-300"/>
            <h1 className="text-5xl font-extrabold mb-4">UJIAN DIBLOKIR</h1>
            <p className="text-2xl mb-8 max-w-xl">Anda telah melakukan pelanggaran keamanan berulang kali. Sesi ujian Anda telah dihentikan secara permanen.</p>
            <button onClick={() => navigate('/')} className="bg-white text-red-900 font-bold py-3 px-8 rounded-full text-lg shadow-xl hover:bg-gray-200">
                KEMBALI KE MENU UTAMA
            </button>
        </div>
      )
  }

  if (loading) {
      return (
          <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                  <Loader className="animate-spin h-10 w-10 text-blue-600 mx-auto mb-4"/>
                  <h2 className="text-xl font-bold">Memuat Soal...</h2>
              </div>
          </div>
      )
  }

  if (!subject || questions.length === 0) return (
      <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
             <AlertTriangle className="h-10 w-10 text-yellow-500 mx-auto mb-4"/>
             <h2 className="text-xl font-bold">Soal tidak ditemukan untuk mata pelajaran ini.</h2>
             <button onClick={() => navigate('/student/dashboard')} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded">Kembali</button>
          </div>
      </div>
  );

  const currentQ = questions[currentQIndex];

  return (
    <div className="flex flex-col h-full bg-gray-50 relative">
      {/* Freeze Overlay */}
      {isFrozen && (
        <div className="fixed inset-0 z-50 bg-red-600/95 backdrop-blur-md text-white flex flex-col items-center justify-center text-center p-8 transition-all">
            <ShieldAlert size={80} className="mb-4 animate-bounce"/>
            <h1 className="text-4xl font-bold mb-2">PERINGATAN KERAS!</h1>
            <p className="text-xl mb-8 max-w-2xl font-medium">{warningMsg}</p>
            <div className="text-7xl font-mono font-bold bg-white/20 px-12 py-6 rounded-2xl mb-4 border-2 border-white/30">
                {freezeTimer}
            </div>
            <p className="mt-4 text-sm opacity-90 font-bold bg-black/20 px-4 py-2 rounded">JANGAN MENCOBA PINDAH TAB ATAU APLIKASI</p>
            <p className="mt-8 font-bold text-yellow-300 text-lg border border-yellow-300 px-6 py-2 rounded-full">Pelanggaran: {violationCount} / {maxViolations}</p>
        </div>
      )}

      {/* Top Bar */}
      <div className="bg-white shadow-sm p-4 flex justify-between items-center z-20">
        <div>
          <h2 className="font-bold text-lg text-gray-800">Soal No. {currentQIndex + 1}</h2>
        </div>
        <div className="flex items-center gap-4">
           <div className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-mono font-bold shadow">
             {formatTime(timeLeft)}
           </div>
           <button onClick={() => setShowList(!showList)} className="bg-gray-700 hover:bg-gray-800 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
             Daftar Soal <List size={14}/>
           </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center relative select-none">
         <div className="bg-white w-full max-w-5xl shadow-md rounded min-h-[400px] flex p-6 relative">
             <div className="flex-1">
                <div className="text-xl mb-8 font-serif leading-relaxed text-gray-800 border-b pb-4">
                  {currentQ.text}
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  {currentQ.shuffledOptions.map((opt, idx) => {
                    const isSelected = answers[currentQ.id] === opt.originalIndex;
                    return (
                        <label key={idx} className={`flex items-center gap-4 cursor-pointer p-4 rounded-lg border-2 transition-all ${isSelected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-400'}`}>
                            {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                        </div>
                        <span className="text-lg font-serif text-gray-700">{opt.text}</span>
                        <input 
                            type="radio" 
                            name={`q-${currentQ.id}`} 
                            className="hidden" 
                            onChange={() => handleAnswer(opt.originalIndex)} 
                            checked={isSelected}
                        />
                        </label>
                    )
                  })}
                </div>
             </div>
         </div>

         {/* Question List Popup */}
         {showList && (
           <div className="absolute top-0 right-0 m-4 w-72 bg-white shadow-2xl rounded-lg border border-gray-200 z-30 p-4 animate-fade-in-up">
             <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold">Navigasi Soal</h4>
                <button onClick={() => setShowList(false)}><X size={16}/></button>
             </div>
             <div className="grid grid-cols-5 gap-2">
                {questions.map((q, idx) => (
                  <button 
                    key={q.id}
                    onClick={() => {setCurrentQIndex(idx); setShowList(false);}}
                    className={`w-10 h-10 rounded border text-sm font-bold flex items-center justify-center transition-colors ${
                      idx === currentQIndex ? 'ring-2 ring-blue-500 border-blue-600 text-blue-600' : 
                      answers[q.id] !== undefined ? 'bg-black text-white border-black' : 'bg-white border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
             </div>
           </div>
         )}
      </div>

      {/* Footer */}
      <div className="bg-white p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex justify-between items-center z-20">
         <button 
           onClick={() => setCurrentQIndex(Math.max(0, currentQIndex - 1))}
           disabled={currentQIndex === 0}
           className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-full flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow"
         >
           <ChevronRight size={18} className="rotate-180"/> SEBELUMNYA
         </button>
         
         {currentQIndex === questions.length - 1 ? (
           <button 
             onClick={() => setShowFinishConfirm(true)}
             className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-8 rounded-full flex items-center gap-2 shadow animate-pulse"
           >
             SELESAI <CheckCircle size={18}/>
           </button>
         ) : (
           <button 
             onClick={() => setCurrentQIndex(Math.min(questions.length - 1, currentQIndex + 1))}
             className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full flex items-center gap-2 shadow"
           >
             BERIKUTNYA <ChevronRight size={18}/>
           </button>
         )}
      </div>

      {/* Confirmation Modal */}
      <Modal isOpen={showFinishConfirm} onClose={() => setShowFinishConfirm(false)} title="Konfirmasi Selesai">
         <div className="text-center">
           <p className="mb-6 text-gray-700 text-lg">
             Apakah Anda yakin ingin mengakhiri ujian ini? <br/>
             Pastikan semua jawaban telah terisi dengan benar.
           </p>
           <div className="flex justify-center gap-4">
             <button onClick={() => setShowFinishConfirm(false)} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded shadow">BATAL</button>
             <button onClick={finishTest} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded shadow">YA, SELESAI</button>
           </div>
         </div>
      </Modal>
    </div>
  );
};

const ExamResult = () => {
    const navigate = useNavigate();
    const score = localStorage.getItem('examScore') || '0';
    const student = JSON.parse(localStorage.getItem('studentData') || '{}');
    const subject = JSON.parse(localStorage.getItem('selectedSubject') || '{}');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-90 backdrop-blur-sm p-4 animate-fade-in-up">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                <div className="mb-4 flex justify-center">
                    <div className="bg-green-100 p-4 rounded-full">
                        <CheckCircle size={48} className="text-green-600" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-1">Ujian Selesai!</h2>
                <p className="text-gray-500 mb-6">Terimakasih {student.name}</p>
                
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
                    <p className="text-sm text-gray-500 uppercase tracking-wide mb-1">{subject.name || 'Ujian'}</p>
                    <div className="text-5xl font-extrabold text-blue-600">{parseFloat(score).toFixed(0)}</div>
                    <p className="text-xs text-gray-400 mt-2">Nilai Akhir</p>
                </div>

                <button onClick={() => navigate('/student/dashboard')} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg transition-transform hover:scale-105">
                    KEMBALI KE BERANDA
                </button>
            </div>
        </div>
    )
};

// --- LAYOUTS ---

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
    { id: 'live', label: 'Live Monitoring', icon: Activity, path: '/admin/live' },
    { id: 'bank-soal', label: 'Bank Soal', icon: Database, path: '/admin/bank-soal' },
    { id: 'jadwal', label: 'Jadwal & Mapel', icon: CalendarClock, path: '/admin/jadwal' },
    { id: 'peserta', label: 'Data Peserta', icon: Users, path: '/admin/peserta' },
    { id: 'hasil', label: 'Hasil Ujian', icon: FileText, path: '/admin/hasil' },
    { id: 'cetak', label: 'Cetak Kartu', icon: Printer, path: '/admin/cetak' },
    { id: 'settings', label: 'Pengaturan', icon: SettingsIcon, path: '/admin/settings' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('userRole');
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans print:h-auto print:block">
      <div className="w-64 bg-blue-900 text-white flex flex-col shadow-2xl z-20 print:hidden">
        <div className="p-6 border-b border-blue-800 flex items-center gap-3">
           <img src={localStorage.getItem('logoUrl') || LOGO_URL} alt="Logo" className="w-10 h-10 bg-white rounded-full p-1" />
           <div><h1 className="font-bold text-lg tracking-wide">CBT ADMIN</h1><p className="text-xs text-blue-300">Panel Sekolah</p></div>
        </div>
        <div className="flex-1 overflow-y-auto py-4 space-y-1">
           {menuItems.map(item => (
             <SidebarItem key={item.id} icon={item.icon} label={item.label} active={location.pathname.includes(item.path)} onClick={() => navigate(item.path)} />
           ))}
        </div>
        <div className="p-4 border-t border-blue-800">
           <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-300 hover:bg-red-900/50 hover:text-red-100 rounded transition-colors"><LogOut size={20} /><span className="font-medium text-sm">Keluar</span></button>
        </div>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden relative print:overflow-visible">
         <header className="bg-white shadow-sm h-16 flex items-center justify-between px-6 z-10 print:hidden">
            <h2 className="text-xl font-bold text-gray-800 capitalize">{menuItems.find(m => location.pathname.includes(m.path))?.label || 'Dashboard'}</h2>
            <div className="flex items-center gap-4"><div className="text-right hidden md:block"><div className="text-sm font-bold text-gray-800">Administrator</div><div className="text-xs text-gray-500">SD NEGERI 1 BEJI</div></div><div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold border-2 border-blue-200">A</div></div>
         </header>
         <main className="flex-1 overflow-y-auto p-6 relative print:p-0 print:overflow-visible">{children}</main>
      </div>
    </div>
  );
};

const StudentLayout = () => {
  const navigate = useNavigate();
  const student = JSON.parse(localStorage.getItem('studentData') || '{"name":"Siswa", "nisn": "000"}');

  const handleLogout = async () => {
      // Update DB status before logout
      if (student.id) {
          await supabase.from('students').update({ is_login: false }).eq('id', student.id);
      }
      localStorage.removeItem('userRole');
      localStorage.removeItem('studentData');
      localStorage.removeItem('selectedSubject');
      navigate('/');
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 font-sans">
      <header className="bg-white shadow-md py-3 px-6 fixed top-0 w-full z-40 flex items-center justify-between border-b-4 border-blue-600">
         <div className="flex items-center gap-3">
           <img src={localStorage.getItem('logoUrl') || LOGO_URL} className="h-10 w-10" alt="Logo" />
           <div><h1 className="text-xl font-bold text-gray-800 leading-none">{localStorage.getItem('appName') || 'TKA MANDIRI'}</h1><span className="text-xs text-blue-600 font-bold tracking-wider">APLIKASI ANBK - Simulasi TKA</span></div>
         </div>
         <div className="flex items-center gap-4">
           <div className="text-right hidden sm:block"><div className="font-bold text-gray-700 text-sm">{student.nisn} - {student.name}</div><div className="text-xs text-gray-500">PESERTA TKA</div></div>
           <button onClick={handleLogout} className="text-red-500 hover:bg-red-50 p-2 rounded"><LogOut size={20}/></button>
         </div>
      </header>
      <main className="flex-1 pt-20 pb-16">
         <Outlet />
      </main>
      <footer className="fixed bottom-0 w-full bg-blue-800 text-white text-center py-2 text-xs z-40 shadow-inner">
           @copyright {localStorage.getItem('appName') || 'TKA Mandiri'} | Beji 2026. All rights reserved.
      </footer>
    </div>
  );
};

// --- MAIN ROUTER ---

const App = () => {
  return (
    <BrowserRouter>
       <Routes>
         <Route path="/" element={<UniversalLogin />} />
         
         {/* Admin Routes */}
         <Route path="/admin/*" element={<AdminLayout><Routes>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="live" element={<LiveMonitoring />} />
            <Route path="bank-soal" element={<BankSoal />} />
            <Route path="jadwal" element={<JadwalMapel />} />
            <Route path="peserta" element={<DataPeserta />} />
            <Route path="hasil" element={<HasilUjian />} />
            <Route path="cetak" element={<CetakKartu />} />
            <Route path="settings" element={<Settings />} />
         </Routes></AdminLayout>} />

         {/* Student Routes */}
         <Route path="/student" element={<StudentLayout />}>
             <Route path="dashboard" element={<StudentDashboard />} />
             <Route path="confirmation" element={<ExamConfirmation />} />
             <Route path="review" element={<ExamReview />} />
             <Route path="exam" element={<ExamInterface />} />
             <Route path="result" element={<ExamResult />} />
         </Route>

         <Route path="*" element={<Navigate to="/" />} />
       </Routes>
    </BrowserRouter>
  );
};

export default App;