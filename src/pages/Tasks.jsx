import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function Tasks() {
    const [tasks, setTasks] = useState([])
    const [newTaskTitle, setNewTaskTitle] = useState('')
    const [loading, setLoading] = useState(false)
    const [currentUserId, setCurrentUserId] = useState(null)
    const [expandedTasks, setExpandedTasks] = useState({})
    const [usernames, setUsernames] = useState({}) // Кэш имён пользователей
    const navigate = useNavigate()

    const statuses = [
        { value: 'pending', label: '📋 Поставлена', color: '#9e9e9e' },
        { value: 'in_progress', label: '🏗️ В работе', color: '#ff9800' },
        { value: 'review', label: '🔍 На проверке', color: '#2196f3' },
        { value: 'done', label: '✅ Выполнена', color: '#4caf50' }
    ]

    // Функция обрезки текста (50 символов для краткого вида)
    function truncateText(text) {
        const maxLength = 50
        if (!text) return ''
        if (text.length <= maxLength) return text
        return text.slice(0, maxLength)
    }

    // Получить текст для отображения (развёрнутый или сокращённый)
    function getDisplayText(task) {
        if (expandedTasks[task.id]) return task.title
        return truncateText(task.title)
    }

    // Переключить состояние развёрнутости задачи
    function toggleExpand(taskId) {
        setExpandedTasks(prev => ({
            ...prev,
            [taskId]: !prev[taskId]
        }))
    }

    // Получить имя пользователя по ID
    async function getUsername(userId) {
        // Проверяем кэш
        if (usernames[userId]) return usernames[userId]
        
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', userId)
                .single()
            
            if (!error && data?.username) {
                setUsernames(prev => ({ ...prev, [userId]: data.username }))
                return data.username
            }
        } catch (e) {
            // Если таблицы profiles нет, пробуем другой способ
        }
        
        return 'Пользователь'
    }

    async function fetchTasks() {
        setLoading(true)

        const { data: { user } } = await supabase.auth.getUser()
        setCurrentUserId(user.id)

        // Простой запрос без JOIN
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Ошибка загрузки:', error)
        } else {
            // Загружаем имена для всех пользователей
            const userIds = [...new Set(data.map(task => task.user_id))]
            for (const userId of userIds) {
                await getUsername(userId)
            }
            setTasks(data)
        }
        setLoading(false)
    }

    async function addTask() {
        if (!newTaskTitle.trim()) return

        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
            console.error('Ошибка получения пользователя:', userError)
            return
        }

        const { data, error } = await supabase
            .from('tasks')
            .insert([{
                title: newTaskTitle,
                user_id: user.id
            }])
            .select()

        if (error) {
            console.error('Ошибка добавления:', error)
        } else {
            setNewTaskTitle('')
            fetchTasks()
        }
    }

    async function updateStatus(id, newStatus) {
        const task = tasks.find(t => t.id === id)
        if (task && task.user_id !== currentUserId) {
            console.warn('Нельзя изменять чужую задачу')
            return
        }

        const { error } = await supabase
            .from('tasks')
            .update({ status: newStatus })
            .eq('id', id)

        if (error) {
            console.error('Ошибка обновления:', error)
        } else {
            fetchTasks()
        }
    }

    async function deleteTask(id) {
        const task = tasks.find(t => t.id === id)
        if (task && task.user_id !== currentUserId) {
            console.warn('Нельзя удалять чужую задачу')
            return
        }

        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Ошибка удаления:', error)
        } else {
            fetchTasks()
        }
    }

    async function handleLogout() {
        await supabase.auth.signOut()
        navigate('/login')
    }

    useEffect(() => {
        fetchTasks()
    }, [])

    const getStatusColor = (status) => {
        const s = statuses.find(s => s.value === status)
        return s ? s.color : '#999'
    }

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1>Менеджер задач 💩</h1>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => navigate('/profile')} style={styles.profileButton}>
                        👤 Профиль
                    </button>
                    <button onClick={handleLogout} style={styles.logoutButton}>
                        🚪 Выйти
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '30px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => {
                            const value = e.target.value.slice(0, 150)
                            setNewTaskTitle(value)
                        }}
                        placeholder="Что нужно сделать?"
                        style={styles.input}
                        onKeyPress={(e) => e.key === 'Enter' && addTask()}
                        maxLength={150}
                    />
                    <button onClick={addTask} style={styles.addButton}>
                        ➕ Добавить
                    </button>
                </div>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
                    {newTaskTitle.length}/150 символов
                    {newTaskTitle.length === 150 && <span style={{ color: 'orange', marginLeft: '8px' }}>⚠️ Лимит</span>}
                </div>
            </div>

            {loading && <p>Загрузка...</p>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tasks.map(task => {
                    const isOwnTask = task.user_id === currentUserId
                    const isExpanded = expandedTasks[task.id]
                    const needsExpand = task.title && task.title.length > 50
                    const authorName = usernames[task.user_id] || (isOwnTask ? 'Вы' : 'Пользователь')

                    return (
                        <div
                            key={task.id}
                            style={{
                                ...styles.taskCard,
                                borderLeft: `4px solid ${getStatusColor(task.status)}`,
                                backgroundColor: isOwnTask ? '#f5f5f5' : '#fff3e0'
                            }}
                        >
                            <div style={{ flex: 2, minWidth: 0 }}>
                                <div style={{
                                    textDecoration: task.status === 'done' ? 'line-through' : 'none',
                                    fontWeight: 'bold',
                                    wordWrap: 'break-word',
                                    wordBreak: 'break-all',
                                    overflowWrap: 'break-word',
                                    maxWidth: '100%'
                                }}>
                                    {getDisplayText(task)}
                                    {needsExpand && (
                                        <span
                                            onClick={() => toggleExpand(task.id)}
                                            style={{
                                                fontSize: '12px',
                                                color: '#2196f3',
                                                cursor: 'pointer',
                                                marginLeft: '8px',
                                                textDecoration: 'none',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {isExpanded ? '🔼 свернуть' : '📖 развернуть'}
                                        </span>
                                    )}
                                </div>
                                <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                                    {task.created_at ? new Date(task.created_at).toLocaleString() : 'только что'}
                                    <span style={{ marginLeft: '10px' }}>
                                        {isOwnTask ? (
                                            <span style={{ color: '#4caf50' }}>👤 Вы</span>
                                        ) : (
                                            <span style={{ color: '#ff9800' }}>👤 {authorName}</span>
                                        )}
                                    </span>
                                </div>
                            </div>

                            <select
                                value={task.status || 'pending'}
                                onChange={(e) => updateStatus(task.id, e.target.value)}
                                disabled={!isOwnTask}
                                style={{ ...styles.select, borderColor: getStatusColor(task.status) }}
                            >
                                {statuses.map(status => (
                                    <option key={status.value} value={status.value}>
                                        {status.label}
                                    </option>
                                ))}
                            </select>

                            <button
                                onClick={() => deleteTask(task.id)}
                                disabled={!isOwnTask}
                                style={{ ...styles.deleteButton, opacity: !isOwnTask ? 0.5 : 1 }}
                            >
                                🗑️
                            </button>
                        </div>
                    )
                })}
            </div>

            {tasks.length === 0 && !loading && (
                <p style={{ textAlign: 'center', color: '#999', marginTop: '40px' }}>
                    Нет задач. Добавьте первую!
                </p>
            )}
        </div>
    )
}

const styles = {
    profileButton: {
        padding: '8px 16px',
        backgroundColor: '#2196f3',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
    },
    logoutButton: {
        padding: '8px 16px',
        backgroundColor: '#ff4444',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
    },
    input: {
        flex: 1,
        padding: '10px',
        fontSize: '16px',
        border: '1px solid #ddd',
        borderRadius: '4px'
    },
    addButton: {
        padding: '10px 20px',
        backgroundColor: '#4caf50',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
    },
    taskCard: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '15px',
        borderRadius: '8px'
    },
    select: {
        padding: '8px',
        borderRadius: '4px',
        border: '1px solid',
        backgroundColor: 'white',
        cursor: 'pointer'
    },
    deleteButton: {
        backgroundColor: '#ff4444',
        color: 'white',
        border: 'none',
        padding: '8px 12px',
        borderRadius: '4px',
        cursor: 'pointer'
    }
}

export default Tasks