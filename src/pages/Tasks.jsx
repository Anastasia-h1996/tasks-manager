import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function Tasks() {
    const [tasks, setTasks] = useState([])
    const [newTaskTitle, setNewTaskTitle] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const statuses = [
        { value: 'pending', label: '📋 Поставлена !', color: '#9e9e9e' },
        { value: 'in_progress', label: '🏗️ В работе', color: '#ff9800' },
        { value: 'review', label: '🔍 На проверке', color: '#2196f3' },
        { value: 'done', label: '✅ Выполнена', color: '#4caf50' }
    ]

    async function fetchTasks() {
        setLoading(true)
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Ошибка загрузки:', error)
        } else {
            setTasks(data)
        }
        setLoading(false)
    }

    async function addTask() {
        if (!newTaskTitle.trim()) return

        console.log('1. Начинаем добавление задачи:', newTaskTitle)

        // Получаем текущего пользователя
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        console.log('2. Текущий пользователь:', user)

        if (userError) {
            console.error('Ошибка получения пользователя:', userError)
            return
        }

        if (!user) {
            console.error('Пользователь не найден!')
            return
        }

        const { data, error } = await supabase
            .from('tasks')
            .insert([{
                title: newTaskTitle,
                user_id: user.id
            }])
            .select()  // ← добавили .select() чтобы увидеть результат

        console.log('3. Результат вставки:', { data, error })

        if (error) {
            console.error('Ошибка добавления:', error)
        } else {
            console.log('Успешно добавлено:', data)
            setNewTaskTitle('')
            fetchTasks()
        }
    }

    async function updateStatus(id, newStatus) {
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
                <h1>Менеджер задач 📋</h1>
                <button onClick={handleLogout} style={styles.logoutButton}>
                    🚪 Выйти
                </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
                <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Что нужно сделать?"
                    style={styles.input}
                    onKeyPress={(e) => e.key === 'Enter' && addTask()}
                />
                <button onClick={addTask} style={styles.addButton}>
                    ➕ Добавить
                </button>
            </div>

            {loading && <p>Загрузка...</p>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tasks.map(task => (
                    <div key={task.id} style={{ ...styles.taskCard, borderLeft: `4px solid ${getStatusColor(task.status)}` }}>
                        <div style={{ flex: 2 }}>
                            <div style={{ textDecoration: task.status === 'done' ? 'line-through' : 'none', fontWeight: 'bold' }}>
                                {task.title}
                            </div>
                            <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                                {task.created_at ? new Date(task.created_at).toLocaleString() : 'только что'}
                            </div>
                        </div>

                        <select
                            value={task.status || 'pending'}
                            onChange={(e) => updateStatus(task.id, e.target.value)}
                            style={{ ...styles.select, borderColor: getStatusColor(task.status) }}
                        >
                            {statuses.map(status => (
                                <option key={status.value} value={status.value}>
                                    {status.label}
                                </option>
                            ))}
                        </select>

                        <button onClick={() => deleteTask(task.id)} style={styles.deleteButton}>
                            🗑️
                        </button>
                    </div>
                ))}
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
        backgroundColor: '#f5f5f5',
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