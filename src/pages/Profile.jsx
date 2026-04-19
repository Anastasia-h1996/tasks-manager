import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function Profile() {
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState({ text: '', type: '' })
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState({
        username: '',
        email: '',
        avatar_url: ''
    })
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [avatarFile, setAvatarFile] = useState(null)
    const [avatarPreview, setAvatarPreview] = useState(null)
    const navigate = useNavigate()

    // Загрузка данных пользователя
    useEffect(() => {
        loadUserProfile()
    }, [])

    async function loadUserProfile() {
        setLoading(true)

        // Получаем текущего пользователя
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
            console.error('Ошибка загрузки пользователя:', userError)
            navigate('/login')
            return
        }

        setUser(user)
        setProfile({
            username: user.user_metadata?.username || '',
            email: user.email || '',
            avatar_url: user.user_metadata?.avatar_url || ''
        })

        if (user.user_metadata?.avatar_url) {
            setAvatarPreview(user.user_metadata.avatar_url)
        }

        setLoading(false)
    }

    // Обновление имени пользователя
    async function updateUsername() {
        if (!profile.username.trim()) {
            setMessage({ text: 'Имя не может быть пустым', type: 'error' })
            return
        }

        setLoading(true)
        const { error } = await supabase.auth.updateUser({
            data: { username: profile.username }
        })

        if (error) {
            setMessage({ text: error.message, type: 'error' })
        } else {
            setMessage({ text: 'Имя успешно обновлено!', type: 'success' })
        }
        setLoading(false)
    }

    // Обновление пароля
    async function updatePassword() {
        if (newPassword !== confirmPassword) {
            setMessage({ text: 'Пароли не совпадают', type: 'error' })
            return
        }

        if (newPassword.length < 6) {
            setMessage({ text: 'Пароль должен быть минимум 6 символов', type: 'error' })
            return
        }

        setLoading(true)
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        })

        if (error) {
            setMessage({ text: error.message, type: 'error' })
        } else {
            setMessage({ text: 'Пароль успешно изменён!', type: 'success' })
            setNewPassword('')
            setConfirmPassword('')
        }
        setLoading(false)
    }

    // Загрузка аватара
    async function uploadAvatar() {
        if (!avatarFile) return;

        setLoading(true);
        const fileExt = avatarFile.name.split('.').pop();
        // Упрощенный путь: просто имя файла без вложенных папок
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;

        // 1. Загружаем файл в корень bucket 'avatars'
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, avatarFile); // Убрали вложенную папку 'avatars/'

        if (uploadError) {
            console.error('Upload error:', uploadError);
            setMessage({ text: `Ошибка загрузки: ${uploadError.message}`, type: 'error' });
            setLoading(false);
            return;
        }

        // 2. Получаем публичный URL
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);

        // 3. Обновляем профиль пользователя
        const { error: updateError } = await supabase.auth.updateUser({
            data: { avatar_url: publicUrl }
        });

        if (updateError) {
            setMessage({ text: updateError.message, type: 'error' });
        } else {
            setMessage({ text: 'Аватар успешно обновлён!', type: 'success' });
            setAvatarPreview(publicUrl);
            setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
        }
        setLoading(false);
        setAvatarFile(null);
    }

    // Обработка выбора файла
    function handleAvatarChange(e) {
        const file = e.target.files[0]
        if (file) {
            setAvatarFile(file)
            setAvatarPreview(URL.createObjectURL(file))
        }
    }

    // Выход
    async function handleLogout() {
        await supabase.auth.signOut()
        navigate('/login')
    }

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.header}>
                    <h1>👤 Личный кабинет</h1>
                    <button onClick={handleLogout} style={styles.logoutButton}>
                        🚪 Выйти
                    </button>
                </div>

                {message.text && (
                    <div style={{
                        ...styles.message,
                        backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
                        color: message.type === 'success' ? '#155724' : '#721c24'
                    }}>
                        {message.text}
                    </div>
                )}

                {loading && <p>Загрузка...</p>}

                {/* Аватар */}
                <div style={styles.avatarSection}>
                    <div style={styles.avatarContainer}>
                        {avatarPreview ? (
                            <img src={avatarPreview} alt="Аватар" style={styles.avatar} />
                        ) : (
                            <div style={styles.avatarPlaceholder}>👤</div>
                        )}
                    </div>
                    <div style={styles.avatarControls}>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            style={styles.fileInput}
                        />
                        <button
                            onClick={uploadAvatar}
                            disabled={!avatarFile || loading}
                            style={styles.button}
                        >
                            📸 Загрузить аватар
                        </button>
                    </div>
                </div>

                {/* Email (только для чтения) */}
                <div style={styles.field}>
                    <label style={styles.label}>📧 Email</label>
                    <input
                        type="email"
                        value={profile.email}
                        disabled
                        style={{ ...styles.input, backgroundColor: '#f0f0f0' }}
                    />
                    <span style={styles.hint}>Email нельзя изменить</span>
                </div>

                {/* Имя пользователя */}
                <div style={styles.field}>
                    <label style={styles.label}>📝 Имя пользователя</label>
                    <div style={styles.row}>
                        <input
                            type="text"
                            value={profile.username}
                            onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                            placeholder="Ваше имя"
                            style={styles.input}
                        />
                        <button onClick={updateUsername} disabled={loading} style={styles.button}>
                            💾 Сохранить
                        </button>
                    </div>
                </div>

                {/* Смена пароля */}
                <div style={styles.divider} />
                <h3 style={styles.subtitle}>🔒 Смена пароля</h3>

                <div style={styles.field}>
                    <label style={styles.label}>Новый пароль</label>
                    <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Минимум 6 символов"
                        style={styles.input}
                    />
                </div>

                <div style={styles.field}>
                    <label style={styles.label}>Подтверждение пароля</label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Повторите пароль"
                        style={styles.input}
                    />
                </div>

                <button onClick={updatePassword} disabled={loading} style={styles.button}>
                    🔑 Сменить пароль
                </button>

                <div style={styles.nav}>
                    <button onClick={() => navigate('/tasks')} style={styles.navButton}>
                        ← Вернуться к задачам
                    </button>
                </div>
            </div>
        </div>
    )
}

const styles = {
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f0f0f0',
        padding: '20px'
    },
    card: {
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '12px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        maxWidth: '500px',
        width: '100%'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
    },
    logoutButton: {
        padding: '8px 16px',
        backgroundColor: '#ff4444',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
    },
    avatarSection: {
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        marginBottom: '25px',
        paddingBottom: '20px',
        borderBottom: '1px solid #eee'
    },
    avatarContainer: {
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        overflow: 'hidden',
        backgroundColor: '#e0e0e0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    avatar: {
        width: '100%',
        height: '100%',
        objectFit: 'cover'
    },
    avatarPlaceholder: {
        fontSize: '40px'
    },
    avatarControls: {
        flex: 1
    },
    fileInput: {
        marginBottom: '8px',
        fontSize: '14px'
    },
    field: {
        marginBottom: '20px'
    },
    label: {
        display: 'block',
        marginBottom: '5px',
        fontWeight: 'bold',
        color: '#333'
    },
    input: {
        width: '100%',
        padding: '10px',
        fontSize: '16px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        boxSizing: 'border-box'
    },
    row: {
        display: 'flex',
        gap: '10px'
    },
    button: {
        padding: '10px 20px',
        backgroundColor: '#4caf50',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        whiteSpace: 'nowrap'
    },
    divider: {
        height: '1px',
        backgroundColor: '#eee',
        margin: '20px 0'
    },
    subtitle: {
        marginBottom: '15px',
        color: '#333'
    },
    message: {
        padding: '10px',
        borderRadius: '4px',
        marginBottom: '20px',
        textAlign: 'center'
    },
    hint: {
        fontSize: '12px',
        color: '#999',
        marginTop: '4px',
        display: 'block'
    },
    nav: {
        marginTop: '20px',
        textAlign: 'center'
    },
    navButton: {
        padding: '10px 20px',
        backgroundColor: '#2196f3',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
    }
}

export default Profile