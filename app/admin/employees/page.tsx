'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, get, set, remove, update } from 'firebase/database';
import { auth, database } from '@/lib/firebase';
import { FiUpload, FiPlus, FiEdit2, FiTrash2, FiDownload, FiCheck, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export default function EmployeesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    msnv: '',
    name: '',
    email: '',
  });

  // Check authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.push('/login');
        return;
      }

      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);
      
      if (snapshot.exists()) {
        let foundUser: any = null;
        snapshot.forEach((childSnapshot) => {
          const userData = childSnapshot.val();
          if (userData.uid === firebaseUser.uid) {
            foundUser = { ...userData, maNV: childSnapshot.key };
          }
        });

        if (foundUser && foundUser.role === 'admin') {
          setUser(foundUser);
        } else {
          router.push('/player');
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Listen to employees
  useEffect(() => {
    const employeesRef = ref(database, 'employees');
    const unsubscribe = onValue(employeesRef, (snapshot) => {
      if (snapshot.exists()) {
        const employeesData = snapshot.val();
        const employeesArray = Object.keys(employeesData).map((key) => ({
          msnv: key,
          ...employeesData[key],
        }));
        setEmployees(employeesArray);
      } else {
        setEmployees([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Handle import Excel/CSV
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        let importCount = 0;

        for (const row of jsonData as any[]) {
          const msnv = row['MSNV'] || row['Mã NV'] || row['MaNV'] || '';
          const name = row['Họ tên'] || row['Name'] || row['Ten'] || '';
          const email = row['Email'] || row['email'] || '';

          if (msnv && email) {
            await set(ref(database, `employees/${msnv}`), {
              name: name.toUpperCase(),
              email: email.toLowerCase(),
              registered: false,
              createdAt: Date.now(),
            });
            importCount++;
          }
        }

        toast.success(`Đã import ${importCount} nhân viên!`);
      } catch (error) {
        console.error(error);
        toast.error('Lỗi khi import file!');
      }
    };

    reader.readAsBinaryString(file);
  };

  // Handle add employee
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.msnv || !formData.name || !formData.email) {
      toast.error('Vui lòng điền đầy đủ thông tin!');
      return;
    }

    try {
      if (editingEmployee) {
        // SỬA - Chỉ check email trùng
        const allEmployees = await get(ref(database, 'employees'));
        if (allEmployees.exists()) {
          const employeesData = allEmployees.val();
          
          // Check email trùng (trừ chính mình)
          const duplicateEmail = Object.keys(employeesData).find(key => 
            key !== editingEmployee.msnv && 
            employeesData[key].email.toLowerCase() === formData.email.toLowerCase()
          );
          
          if (duplicateEmail) {
            toast.error(`Email đã được sử dụng bởi ${employeesData[duplicateEmail].name}!`);
            return;
          }
        }
        
        await update(ref(database, `employees/${editingEmployee.msnv}`), {
          name: formData.name.toUpperCase(),
          email: formData.email.toLowerCase(),
        });
        toast.success('Đã cập nhật nhân viên!');
      } else {
        // THÊM MỚI - Check cả MSNV và Email
        const allEmployees = await get(ref(database, 'employees'));
        if (allEmployees.exists()) {
          const employeesData = allEmployees.val();
          
          // Check MSNV trùng
          if (employeesData[formData.msnv]) {
            toast.error(`MSNV ${formData.msnv} đã tồn tại!`);
            return;
          }
          
          // Check Email trùng
          const duplicateEmail = Object.keys(employeesData).find(key => 
            employeesData[key].email.toLowerCase() === formData.email.toLowerCase()
          );
          
          if (duplicateEmail) {
            toast.error(`Email đã được sử dụng bởi ${employeesData[duplicateEmail].name}!`);
            return;
          }
        }
        await set(ref(database, `employees/${formData.msnv}`), {
          name: formData.name.toUpperCase(),
          email: formData.email.toLowerCase(),
          registered: false,
          createdAt: Date.now(),
        });
        toast.success('Đã thêm nhân viên mới!');
      }

      setShowAddModal(false);
      setEditingEmployee(null);
      setFormData({ msnv: '', name: '', email: '' });
    } catch (error) {
      console.error(error);
      toast.error('Có lỗi xảy ra!');
    }
  };

  // Handle delete
  const handleDelete = async (msnv: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa nhân viên này?')) return;

    try {
      await remove(ref(database, `employees/${msnv}`));
      toast.success('Đã xóa nhân viên!');
    } catch (error) {
      console.error(error);
      toast.error('Có lỗi xảy ra!');
    }
  };

  // Handle edit
  const handleEdit = (employee: any) => {
    setEditingEmployee(employee);
    setFormData({
      msnv: employee.msnv,
      name: employee.name,
      email: employee.email,
    });
    setShowAddModal(true);
  };

  // Handle reset password
const handleResetPassword = async (employee: any) => {
  if (!confirm(`Bạn có chắc chắn muốn reset mật khẩu cho ${employee.name}?\n\nUser sẽ phải đăng ký lại từ đầu!`)) {
    return;
  }

  try {
    // 1. Tìm user trong Authentication để xóa
    const usersRef = ref(database, 'users');
    const usersSnapshot = await get(usersRef);
    
    if (usersSnapshot.exists()) {
      const usersData = usersSnapshot.val();
      const userToDelete = usersData[employee.msnv];
      
      if (userToDelete && userToDelete.email) {
        // Xóa trong Authentication (cần Firebase Admin SDK - không làm được từ client)
        // Workaround: Chỉ xóa trong Database, user sẽ không đăng nhập được
        
        // 2. Xóa trong /users/
        await remove(ref(database, `users/${employee.msnv}`));
        
        // 3. Đổi registered về false
        await update(ref(database, `employees/${employee.msnv}`), {
          registered: false,
        });
        
        toast.success(`Đã reset! User ${employee.name} cần đăng ký lại.`);
      }
    }
  } catch (error) {
    console.error(error);
    toast.error('Có lỗi xảy ra!');
  }
};

  // Export to Excel
  const handleExport = () => {
    const data = employees.map(e => ({
      'MSNV': e.msnv,
      'Họ tên': e.name,
      'Email': e.email,
      'Đã đăng ký': e.registered ? 'Có' : 'Chưa',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Nhân viên');
    XLSX.writeFile(wb, `NhanVien_${Date.now()}.xlsx`);

    toast.success('Đã export file Excel!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600 text-xl font-bold">Đang tải...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-gray-800">Quản lý nhân viên</h1>
          <p className="text-gray-600 mt-1">Tổng cộng: {employees.length} nhân viên</p>
        </div>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold px-6 py-3 rounded-lg shadow-lg transform hover:scale-105 transition-all cursor-pointer">
            <FiUpload size={20} />
            Import Excel/CSV
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold px-6 py-3 rounded-lg shadow-lg transform hover:scale-105 transition-all"
          >
            <FiDownload size={20} />
            Export Excel
          </button>
          <button
            onClick={() => {
              setEditingEmployee(null);
              setFormData({ msnv: '', name: '', email: '' });
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold px-6 py-3 rounded-lg shadow-lg transform hover:scale-105 transition-all"
          >
            <FiPlus size={20} />
            Thêm thủ công
          </button>
        </div>
      </div>

      {/* Employees table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">MSNV</th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Họ tên</th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Email</th>
              <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">Đã đăng ký</th>
              <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {employees.length > 0 ? (
              employees.map((emp) => (
                <tr key={emp.msnv} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="bg-blue-100 text-blue-800 font-bold px-3 py-1 rounded-full text-sm">
                      {emp.msnv}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-800 font-semibold">{emp.name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-600">{emp.email}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {emp.registered ? (
                      <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 font-bold px-3 py-1 rounded-full text-sm">
                        <FiCheck size={16} />
                        Có
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 font-bold px-3 py-1 rounded-full text-sm">
                        <FiX size={16} />
                        Chưa
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(emp)}
                        className="p-2 hover:bg-blue-100 rounded-lg transition-colors text-blue-600"
                        title="Sửa"
                      >
                        <FiEdit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(emp.msnv)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600"
                        title="Xóa"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  Chưa có nhân viên nào. Import hoặc thêm thủ công!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-black text-gray-800">
                {editingEmployee ? 'Sửa nhân viên' : 'Thêm nhân viên mới'}
              </h2>
            </div>

            <form onSubmit={handleSaveEmployee} className="p-6 space-y-4">
              
              {/* MSNV */}
              <div>
                <label className="block text-gray-700 font-bold mb-2">Mã số nhân viên</label>
                <input
                  type="text"
                  value={formData.msnv}
                  onChange={(e) => setFormData({ ...formData, msnv: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 uppercase font-bold"
                  placeholder="VD: SO1487"
                  disabled={!!editingEmployee}
                  required
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-gray-700 font-bold mb-2">Họ tên</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="VD: NGUYEN VAN A"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-gray-700 font-bold mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="email@company.com"
                  required
                />
              </div>

              {/* Buttons */}
              <div className="space-y-3 pt-4">
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold px-6 py-3 rounded-lg shadow-lg transform hover:scale-105 transition-all"
                  >
                    {editingEmployee ? 'Cập nhật' : 'Thêm mới'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingEmployee(null);
                    }}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold px-6 py-3 rounded-lg"
                  >
                    Hủy
                  </button>
                </div>
                
                {/* Nút Reset Password - CHỈ KHI EDIT */}
                {editingEmployee && editingEmployee.registered && (
                  <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                    <p className="text-red-800 font-bold mb-2 text-sm">
                      ⚠️ Reset mật khẩu sẽ xóa tài khoản hiện tại. User phải đăng ký lại!
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        handleResetPassword(editingEmployee);
                      }}
                      className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold px-4 py-2 rounded-lg shadow-md transform hover:scale-105 transition-all flex items-center justify-center gap-2"
                    >
                      🔄 Reset Mật Khẩu
                    </button>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}