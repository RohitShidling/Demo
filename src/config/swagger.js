const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'MES Backend API - Manufacturing Execution System',
            version: '4.0.0',
            description: 'Complete API documentation for the MES (Manufacturing Execution System) backend for Cookware Manufacturing. APIs are categorized by domain.',
            contact: { name: 'Rohit', email: 'rohit@mes.com' }
        },
        servers: [{ url: '/api', description: 'API Server' }],
        components: {
            securitySchemes: {
                bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Enter JWT token obtained from login' }
            },
            schemas: {
                AuthTokens: {
                    type: 'object',
                    properties: {
                        accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                        refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                        expiresIn: { type: 'string', example: '2d' },
                        refreshExpiresIn: { type: 'string', example: '2d' }
                    }
                },
                WorkOrderMachineAssignment: {
                    type: 'object',
                    required: ['machine_id', 'stage_order'],
                    properties: {
                        machine_id: { type: 'string', example: 'MACH-A1B2C3D4' },
                        stage_order: { type: 'integer', minimum: 1, example: 2, description: 'Must be the next stage only. If stage 1 exists, next must be stage 2.' }
                    }
                },
                MachineStatusUpdate: {
                    type: 'object',
                    required: ['machine_id', 'status'],
                    properties: {
                        machine_id: { type: 'string', example: 'MACH-A1B2C3D4' },
                        status: { type: 'string', enum: ['RUNNING', 'MAINTENANCE', 'NOT_STARTED'], example: 'RUNNING' }
                    }
                }
            }
        },
        security: [{ bearerAuth: [] }],
        tags: [
            { name: 'Business Auth', description: 'Business/Admin level authentication APIs' },
            { name: 'Operator Auth', description: 'Operator level authentication APIs' },
            { name: 'Machines', description: 'Machine management, downtime, and data ingestion' },
            { name: 'Machine Checklist', description: 'Machine checklists - safety, cleaning, lubrication check sheets' },
            { name: 'Work Orders', description: 'Work order CRUD, machine assignment, and production tracking' },
            { name: 'Workflows', description: 'Workflow steps management for work orders' },
            { name: 'Production', description: 'Production recording and ingestion' },
            { name: 'Operators', description: 'Operator checklist, rejections, skills, assignments, breakdowns' },
            { name: 'Dashboard', description: 'Business dashboard overview and analytics' },
            { name: 'Notifications', description: 'Notification management' },
            { name: 'Alerts', description: 'System alerts and warnings' },
            { name: 'System', description: 'System and health APIs' }
        ],
        paths: {
            '/health': {
                get: {
                    tags: ['System'],
                    summary: 'Health check',
                    security: [],
                    responses: { '200': { description: 'API and server are healthy' } }
                }
            },
            // ═══════════════════════════════════════════════
            // BUSINESS AUTH
            // ═══════════════════════════════════════════════
            '/business/auth/register': {
                post: {
                    tags: ['Business Auth'], summary: 'Register business user', security: [],
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['username', 'email', 'password'], properties: { username: { type: 'string', example: 'admin1' }, email: { type: 'string', example: 'admin@mes.com' }, password: { type: 'string', minLength: 6, example: 'pass123' } } } } } },
                    responses: { '201': { description: 'User registered successfully' }, '400': { description: 'Validation error' } }
                }
            },
            '/business/auth/login': {
                post: {
                    tags: ['Business Auth'], summary: 'Login business user', security: [],
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', example: 'admin@mes.com' }, password: { type: 'string', example: 'pass123' } } } } } },
                    responses: { '200': { description: 'Login successful, returns accessToken and refreshToken' }, '401': { description: 'Invalid credentials' } }
                }
            },
            '/business/auth/logout': {
                post: { tags: ['Business Auth'], summary: 'Logout business user', responses: { '200': { description: 'Logged out' } } }
            },
            '/business/auth/refresh': {
                post: {
                    tags: ['Business Auth'], summary: 'Refresh access token', security: [],
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' } } } } } },
                    responses: { '200': { description: 'Token refreshed' } }
                }
            },
            '/business/auth/me': {
                get: { tags: ['Business Auth'], summary: 'Get current business user profile', responses: { '200': { description: 'User profile' } } }
            },

            // ═══════════════════════════════════════════════
            // OPERATOR AUTH
            // ═══════════════════════════════════════════════
            '/operator/auth/register': {
                post: {
                    tags: ['Operator Auth'], summary: 'Register operator user', security: [],
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['username', 'email', 'password'], properties: { username: { type: 'string', example: 'operator1' }, email: { type: 'string', example: 'op@mes.com' }, password: { type: 'string', minLength: 6, example: 'pass123' } } } } } },
                    responses: { '201': { description: 'Operator registered' }, '400': { description: 'Validation error' } }
                }
            },
            '/operator/auth/login': {
                post: {
                    tags: ['Operator Auth'], summary: 'Login operator user', security: [],
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', example: 'operator@mes.com' }, password: { type: 'string', example: 'pass123' } } } } } },
                    responses: { '200': { description: 'Login successful' }, '401': { description: 'Invalid credentials' } }
                }
            },
            '/operator/auth/logout': {
                post: { tags: ['Operator Auth'], summary: 'Logout operator', responses: { '200': { description: 'Logged out' } } }
            },
            '/operator/auth/refresh': {
                post: {
                    tags: ['Operator Auth'], summary: 'Refresh operator token', security: [],
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' } } } } } },
                    responses: { '200': { description: 'Token refreshed' } }
                }
            },
            '/operator/auth/me': {
                get: { tags: ['Operator Auth'], summary: 'Get current operator profile', responses: { '200': { description: 'Operator profile' } } }
            },

            // ═══════════════════════════════════════════════
            // MACHINES
            // ═══════════════════════════════════════════════
            '/machines': {
                post: {
                    tags: ['Machines'], summary: 'Create a new machine',
                    requestBody: { required: true, content: {
                        'multipart/form-data': { schema: { type: 'object', required: ['machine_name', 'ingest_path'], properties: { machine_name: { type: 'string', example: 'CNC Machine 1' }, ingest_path: { type: 'string', example: '/cnc1' }, machine_image: { type: 'string', format: 'binary' } } } },
                        'application/json': { schema: { type: 'object', required: ['machine_name', 'ingest_path'], properties: { machine_name: { type: 'string' }, ingest_path: { type: 'string' } } } }
                    }},
                    responses: { '201': { description: 'Machine created' }, '400': { description: 'Validation error' } }
                },
                get: { tags: ['Machines'], summary: 'Get all machines', responses: { '200': { description: 'List of all machines' } } }
            },
            '/machines/{machineId}/details': {
                get: {
                    tags: ['Machines'],
                    summary: 'Get machine details',
                    description: 'Returns machine info with production metrics **inside current_run only** (total_count, accepted_count, rejected_count). Top-level total_produced/accepted_count/rejected_count have been removed to avoid duplication. progress_percentage is computed from WO machine data.',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Machine details with current_run counts' }, '404': { description: 'Machine not found' } }
                }
            },
            '/machines/{machineId}/visualization': {
                get: {
                    tags: ['Machines'], summary: 'Get machine visualization data',
                    parameters: [
                        { name: 'machineId', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'filter', in: 'query', schema: { type: 'string', enum: ['hourly', 'daily', 'calendar', 'date'], example: 'daily' } },
                        { name: 'start_date', in: 'query', schema: { type: 'string', format: 'date' } },
                        { name: 'end_date', in: 'query', schema: { type: 'string', format: 'date' } }
                    ],
                    responses: { '200': { description: 'Visualization data' } }
                }
            },
            '/machines/{machineId}/dashboard': {
                get: {
                    tags: ['Machines'], summary: 'Get machine dashboard',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Machine dashboard data' } }
                }
            },
            '/machines/{machineId}/history': {
                get: {
                    tags: ['Machines'], summary: 'Get machine run history',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Machine history' } }
                }
            },
            '/machines/production-count': {
                get: { tags: ['Machines'], summary: 'Get total production count for all machines', responses: { '200': { description: 'Production counts' } } }
            },
            '/machines/{machineId}/production-count': {
                get: {
                    tags: ['Machines'], summary: 'Get total production count for a specific machine',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Machine production count' } }
                }
            },
            '/machines/rejection-count': {
                get: { tags: ['Machines'], summary: 'Get total rejection count for all machines', responses: { '200': { description: 'Rejection counts' } } }
            },
            '/machines/{machineId}/rejection-count': {
                get: {
                    tags: ['Machines'], summary: 'Get total rejection count for a specific machine',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Machine rejection count' } }
                }
            },
            '/machines/{machineId}/downtime-analysis': {
                get: {
                    tags: ['Machines'], summary: 'Get downtime analysis',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Downtime analysis' } }
                }
            },
            '/machines/{machineId}/downtime': {
                get: {
                    tags: ['Machines'], summary: 'Get downtime history',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Downtime records' } }
                },
                post: {
                    tags: ['Machines'], summary: 'Record machine downtime',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['start_time'], properties: { reason: { type: 'string' }, severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] }, start_time: { type: 'string', format: 'date-time' }, end_time: { type: 'string', format: 'date-time' } } } } } },
                    responses: { '201': { description: 'Downtime recorded' } }
                }
            },
            '/machines/{machineId}/stop': {
                post: {
                    tags: ['Machines'], summary: 'Stop a running machine',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Machine stopped' } }
                }
            },

            // Production Analytics — 3 dedicated APIs
            '/machines/{machineId}/production/hourly': {
                get: {
                    tags: ['Machines'],
                    summary: 'Hourly production analytics (last 24 hours)',
                    description: 'Returns exactly 24 hourly slots (one per hour) for the last 24 hours. Each slot has total_count, accepted_count, rejected_count. Empty hours return 0s.',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' }, description: 'Machine ID' }],
                    responses: {
                        '200': { description: 'Hourly slots array. period=last_24_hours. slots[].hour_label, hour_start, hour_end, total_count, accepted_count, rejected_count.' },
                        '404': { description: 'Machine not found' }
                    }
                }
            },
            '/machines/{machineId}/production/daily': {
                get: {
                    tags: ['Machines'],
                    summary: 'Daily production analytics (last 31 days)',
                    description: 'Returns exactly 31 day slots. Each day slot has date, day, month, year, day_label, total_count, accepted_count, rejected_count. Days with no production return 0s.',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: {
                        '200': { description: '31-day array. period=last_31_days. days[].date, day_label, total_count, accepted_count, rejected_count.' },
                        '404': { description: 'Machine not found' }
                    }
                }
            },
            '/machines/{machineId}/production/custom': {
                get: {
                    tags: ['Machines'],
                    summary: 'Custom date-range production analytics (month-wise)',
                    description: 'Returns one entry per month for the specified date range. Each month contains aggregated production, accepted, and rejected counts for that month.',
                    parameters: [
                        { name: 'machineId', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'start_date', in: 'query', required: true, schema: { type: 'string', format: 'date', example: '2026-04-01' }, description: 'Start date (YYYY-MM-DD)' },
                        { name: 'end_date', in: 'query', required: true, schema: { type: 'string', format: 'date', example: '2026-04-21' }, description: 'End date (YYYY-MM-DD)' }
                    ],
                    responses: {
                        '200': { description: 'Month-wise array for range. period=custom. months[].month, month_label, production, accepted_count, rejected_count. total_months shows count of months in range.' },
                        '400': { description: 'start_date and end_date are required, start_date must not be after end_date' },
                        '404': { description: 'Machine not found' }
                    }
                }
            },
            '/ingest/{pathId}': {
                post: {
                    tags: ['Machines'], summary: 'Ingest machine data (sensor/counter)',
                    parameters: [{ name: 'pathId', in: 'path', required: true, schema: { type: 'string' }, description: 'Machine ingest path ID' }],
                    responses: { '200': { description: 'Data received' }, '404': { description: 'Machine not found' } }
                }
            },

            // ═══════════════════════════════════════════════
            // MACHINE CHECKLIST
            // ═══════════════════════════════════════════════
            '/checklist': {
                get: { tags: ['Machine Checklist'], summary: 'Get all checklists grouped by machine', responses: { '200': { description: 'All checklists' } } }
            },
            '/checklist/summary': {
                get: { tags: ['Machine Checklist'], summary: 'Get checklist summary (completion stats per machine)', responses: { '200': { description: 'Summary data with checklist_status = COMPLETED or NOT_COMPLETED per machine' } } }
            },
            '/checklist/generic': {
                get: {
                    tags: ['Machine Checklist'],
                    summary: 'Get generic checklist definition',
                    description: 'Returns the common checklist template used for all machines.',
                    responses: { '200': { description: 'Generic checklist definition' } }
                },
                post: {
                    tags: ['Machine Checklist'],
                    summary: 'Create generic checklist item',
                    description: 'Creates a common checklist item (not machine-specific) and automatically syncs it to all machines.',
                    requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', required: ['checkpoint'], properties: { checkpoint: { type: 'string' }, description: { type: 'string' }, specification: { type: 'string' }, method: { type: 'string', enum: ['VISUAL_BY_HAND', 'FUNCTIONAL_TEST', 'MEASUREMENT'] }, image: { type: 'string', format: 'binary' }, timing: { type: 'string' }, sort_order: { type: 'integer' } } } } } },
                    responses: {
                        '201': { description: 'Generic checklist item created and synced' },
                        '400': { description: 'Validation error or no machines configured' }
                    }
                }
            },
            '/checklist/generic/bulk': {
                post: {
                    tags: ['Machine Checklist'],
                    summary: 'Bulk create generic checklist items',
                    description: 'Creates multiple common checklist items and automatically syncs to all machines.',
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['items'], properties: { items: { type: 'array', items: { type: 'object', required: ['checkpoint'], properties: { checkpoint: { type: 'string' }, description: { type: 'string' }, specification: { type: 'string' }, method: { type: 'string', enum: ['VISUAL_BY_HAND', 'FUNCTIONAL_TEST', 'MEASUREMENT'] }, image: { type: 'string', description: 'Base64 encoded image' }, timing: { type: 'string' }, sort_order: { type: 'integer' } } } } } } } } },
                    responses: {
                        '201': { description: 'Generic checklist items created and synced' },
                        '400': { description: 'Validation error or no machines configured' }
                    }
                }
            },
            '/checklist/item/{itemId}': {
                get: {
                    tags: ['Machine Checklist'], summary: 'Get single checklist item by ID',
                    parameters: [{ name: 'itemId', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: { '200': { description: 'Checklist item' }, '404': { description: 'Item not found' } }
                },
                put: {
                    tags: ['Machine Checklist'], summary: 'Update a checklist item',
                    parameters: [{ name: 'itemId', in: 'path', required: true, schema: { type: 'integer' } }],
                    requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', properties: { operator_name: { type: 'string', example: 'Ravi Kumar' }, cell_incharge_name: { type: 'string', example: 'Prakash S' }, checkpoint: { type: 'string' }, description: { type: 'string' }, specification: { type: 'string' }, method: { type: 'string', enum: ['VISUAL_BY_HAND', 'FUNCTIONAL_TEST', 'MEASUREMENT'] }, image: { type: 'string', format: 'binary' }, timing: { type: 'string' }, status: { type: 'string', enum: ['PENDING', 'OK', 'NOT_OK', 'NA', 'DONE', 'NOT_DONE'] }, comments: { type: 'string' }, sort_order: { type: 'integer' } } } } } },
                    responses: { '200': { description: 'Item updated' }, '400': { description: 'Invalid status or method' }, '404': { description: 'Item not found' } }
                },
                delete: {
                    tags: ['Machine Checklist'], summary: 'Delete a checklist item',
                    parameters: [{ name: 'itemId', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: { '200': { description: 'Item deleted' }, '404': { description: 'Item not found' } }
                }
            },
            '/checklist/{machineId}': {
                get: {
                    tags: ['Machine Checklist'], summary: 'Get checklist for a specific machine',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Machine checklist with items ordered by sort_order, including checklist_loaded_at, last_saved_on, and checklist_status (COMPLETED/NOT_COMPLETED)' }, '404': { description: 'Machine not found' } }
                },
                post: {
                    tags: ['Machine Checklist'], summary: 'Create a new checklist item for a machine (disabled)',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    requestBody: { required: false },
                    responses: { '400': { description: 'Machine-specific creation is disabled. Use POST /checklist/generic.' } }
                }
            },
            '/checklist/{machineId}/progress': {
                put: {
                    tags: ['Machine Checklist'],
                    summary: 'Save machine-specific checklist progress',
                    description: 'Updates status/comments per checklist line for one machine and applies operator_name/cell_incharge_name for submitted lines only. Accept each line with either id or checkpoint.',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['items'],
                                    properties: {
                                        operator_name: { type: 'string', example: 'Ravi Kumar' },
                                        cell_incharge_name: { type: 'string', example: 'Prakash S' },
                                        items: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    id: { type: 'integer', example: 101 },
                                                    checkpoint: { type: 'string', example: 'Cleaning' },
                                                    status: { type: 'string', enum: ['PENDING', 'OK', 'NOT_OK', 'NA', 'DONE', 'NOT_DONE'] },
                                                    comments: { type: 'string', example: 'Done and verified' }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': { description: 'Machine checklist progress saved' },
                        '400': { description: 'Invalid payload or no matching checklist rows' },
                        '404': { description: 'Machine not found' }
                    }
                }
            },
            '/checklist/template/sync/{sourceMachineId}': {
                post: {
                    tags: ['Machine Checklist'],
                    summary: 'Sync same checklist template to all machines',
                    description: 'Copies checklist structure (checkpoint, description, specification, method, timing, image, sort_order) from source machine to every machine. Completion status, operator_name, and cell_incharge_name stay machine-specific.',
                    parameters: [{ name: 'sourceMachineId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: {
                        '200': { description: 'Checklist template synced to all machines' },
                        '400': { description: 'Source machine checklist is empty' },
                        '404': { description: 'Source machine not found' }
                    }
                }
            },
            '/checklist/{machineId}/bulk': {
                post: {
                    tags: ['Machine Checklist'], summary: 'Bulk create checklist items for a machine (disabled)',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    requestBody: { required: false },
                    responses: { '400': { description: 'Machine-specific bulk creation is disabled. Use POST /checklist/generic/bulk.' } }
                }
            },
            '/checklist/{machineId}/reorder': {
                put: {
                    tags: ['Machine Checklist'], summary: 'Reorder checklist items for a machine',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['ordered_ids'], properties: { ordered_ids: { type: 'array', items: { type: 'integer' }, example: [3, 1, 5, 2, 4], description: 'Array of checklist item IDs in desired order' } } } } } },
                    responses: { '200': { description: 'Checklist reordered' } }
                }
            },

            // ═══════════════════════════════════════════════
            // WORK ORDERS
            // ═══════════════════════════════════════════════
            '/work-orders': {
                post: {
                    tags: ['Work Orders'], summary: 'Create work order',
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['work_order_id', 'work_order_name', 'target'], properties: {
                        work_order_id: { type: 'string', example: 'WO-2026-001', description: 'Unique Work Order ID provided by the user. Must be unique across all work orders.' },
                        work_order_name: { type: 'string', example: 'Frying Pan - Batch Q1' },
                        target: { type: 'integer', example: 1000 },
                        description: { type: 'string', example: 'Make 1000 frying pans, 24cm aluminum body' },
                        targeted_end_date: { type: 'string', format: 'date', example: '2026-12-31', description: 'Target end date as a full date string. Alternatively use target_day + target_month + target_year.' },
                        target_day: { type: 'integer', example: 31, description: 'Day of targeted end date (1-31). Use with target_month and target_year.' },
                        target_month: { type: 'integer', example: 12, description: 'Month of targeted end date (1-12).' },
                        target_year: { type: 'integer', example: 2026, description: 'Year of targeted end date (e.g. 2026).' }
                    } } } } },
                    responses: {
                        '201': { description: 'Work order created successfully' },
                        '400': { description: 'work_order_id, work_order_name and target are required' },
                        '409': { description: 'Work order ID already exists — provide a unique ID' }
                    }
                },
                get: { tags: ['Work Orders'], summary: 'Get all work orders', responses: { '200': { description: 'List of work orders' } } }
            },
            '/work-orders/{workOrderId}': {
                get: {
                    tags: ['Work Orders'], summary: 'Get work order by ID',
                    parameters: [{ name: 'workOrderId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Work order details' } }
                },
                put: {
                    tags: ['Work Orders'], summary: 'Update work order',
                    parameters: [{ name: 'workOrderId', in: 'path', required: true, schema: { type: 'string' } }],
                    requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { work_order_name: { type: 'string' }, target: { type: 'integer' }, description: { type: 'string' }, status: { type: 'string', enum: ['CREATED', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] } } } } } },
                    responses: { '200': { description: 'Work order updated' } }
                },
                delete: {
                    tags: ['Work Orders'], summary: 'Delete work order',
                    parameters: [{ name: 'workOrderId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Deleted' } }
                }
            },
            '/work-orders/{workOrderId}/machines': {
                post: {
                    tags: ['Work Orders'], summary: 'Assign machine to work order',
                    parameters: [{ name: 'workOrderId', in: 'path', required: true, schema: { type: 'string' } }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/WorkOrderMachineAssignment' } } } },
                    responses: {
                        '200': { description: 'Machine assigned to the requested sequential stage' },
                        '400': { description: 'Invalid stage. Must be next sequential stage only (1,2,3...)' },
                        '409': { 
                            description: 'Conflict Error. Machine is already assigned.',
                            content: {
                                'application/json': {
                                    schema: { type: 'object', properties: { error: { type: 'string' } } },
                                    examples: {
                                        sameWorkOrder: { value: { error: 'already assigned machine to this particular work order, please unassign machine, then try to reassign' } },
                                        differentWorkOrder: { value: { error: "already assigned machine to work order 'WO-123', please unassign machine, then try to reassign" } }
                                    }
                                }
                            }
                        }
                    }
                },
                get: {
                    tags: ['Work Orders'],
                    summary: 'Get machines assigned to work order (stage ordered)',
                    description: 'Returns machines with production metrics **inside** current_run only (total_count, accepted_count, rejected_count). progress_percentage is computed in real-time from WO machine data.',
                    parameters: [{ name: 'workOrderId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'List of assigned machines. Each machine has: machine_id, machine_name, status, stage_order, production_target, progress_percentage, total_rejected_all_time, current_run (with total_count/accepted_count/rejected_count).' } }
                }
            },
            '/work-orders/{workOrderId}/machines/{machineId}/stage': {
                put: {
                    tags: ['Work Orders'], summary: 'Update machine stage order in work order',
                    parameters: [
                        { name: 'workOrderId', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }
                    ],
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['stage_order'], properties: { stage_order: { type: 'integer' } } } } } },
                    responses: { '200': { description: 'Machine stage updated' } }
                }
            },
            '/work-orders/{workOrderId}/checklist-overview': {
                get: {
                    tags: ['Work Orders'], summary: 'Get checklist status overview for all machines in work order',
                    parameters: [{ name: 'workOrderId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Checklist overview (status enum: NOT_STARTED, PENDING, COMPLETED)' } }
                }
            },
            '/work-orders/{workOrderId}/machine-status': {
                get: {
                    tags: ['Work Orders'], summary: 'Get running status overview for all machines in work order',
                    parameters: [{ name: 'workOrderId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Machine status overview (status enum: RUNNING, STOPPED, MAINTENANCE, NOT_STARTED)' } }
                }
            },
            '/work-orders/{workOrderId}/machines/{machineId}': {
                delete: {
                    tags: ['Work Orders'], summary: 'Unassign machine from work order',
                    parameters: [
                        { name: 'workOrderId', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }
                    ],
                    responses: { '200': { description: 'Machine unassigned and its production counts (total, accepted, rejected) are reset to zero.' } }
                }
            },
            '/work-orders/{workOrderId}/rejections': {
                get: {
                    tags: ['Work Orders'], summary: 'Get rejection summary grouped by machine for work order',
                    parameters: [{ name: 'workOrderId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Work order rejections' } }
                }
            },
            '/work-orders/{workOrderId}/rejections/details': {
                get: {
                    tags: ['Work Orders'], summary: 'Get full rejection details for a work order (all machines)',
                    parameters: [{ name: 'workOrderId', in: 'path', required: true, schema: { type: 'string', example: 'WO-3FA91D2B' } }],
                    responses: { '200': { description: 'Detailed rejection list including image/reason/rework/operator/supervisor/timestamp' } }
                }
            },
            '/work-orders/{workOrderId}/machines/{machineId}/rejections': {
                get: {
                    tags: ['Work Orders'], summary: 'Get full rejection details for one machine in a work order',
                    parameters: [
                        { name: 'workOrderId', in: 'path', required: true, schema: { type: 'string', example: 'WO-3FA91D2B' } },
                        { name: 'machineId', in: 'path', required: true, schema: { type: 'string', example: 'MACH-A1B2C3D4' } }
                    ],
                    responses: { '200': { description: 'Machine-specific detailed rejection list for this work order' } }
                }
            },
            '/work-orders/{workOrderId}/production-summary': {
                get: {
                    tags: ['Work Orders'],
                    summary: 'Get production summary for work order',
                    description: '**Business rules applied:** `produced` = last-stage machine\'s production_count (parts that completed the full pipeline). `rejected` = SUM of ALL machines\' rejected_count. `accepted` = produced - rejected.',
                    parameters: [{ name: 'workOrderId', in: 'path', required: true, schema: { type: 'string', example: 'WO-2026-001' } }],
                    responses: {
                        '200': { description: 'work_order_id, work_order_name, target, produced, accepted, rejected, remaining, completion_percentage' },
                        '404': { description: 'Work order not found' }
                    }
                }
            },
            '/work-orders/{workOrderId}/machine-production': {
                get: {
                    tags: ['Work Orders'],
                    summary: 'Per-machine production breakdown for a work order (stage ordered)',
                    description: 'Returns each machine with its own produced_count, rejected_count, accepted_count. is_last_stage=true marks the final pipeline machine whose produced_count equals the WO produced count.',
                    parameters: [{ name: 'workOrderId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: {
                        '200': { description: 'machines[]: machine_id, machine_name, stage_order, is_last_stage, produced_count, accepted_count, rejected_count' },
                        '404': { description: 'Work order not found' }
                    }
                }
            },
            '/work-orders/{workOrderId}/summary': {
                get: {
                    tags: ['Work Orders'],
                    summary: 'Get work order final summary (or machine-grouped)',
                    description: 'Pass `group_by=machine` to get machine-wise breakdown. Without it, returns WO-level summary: produced (last stage), rejected (all machines), accepted, completion_percentage.',
                    parameters: [
                        { name: 'workOrderId', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'group_by', in: 'query', schema: { type: 'string', enum: ['machine'], description: 'Pass machine to get per-machine breakdown' } }
                    ],
                    responses: {
                        '200': { description: 'Final WO summary or machine-grouped data' },
                        '404': { description: 'Work order not found' }
                    }
                }
            },

            // ═══════════════════════════════════════════════
            // WORKFLOWS
            // ═══════════════════════════════════════════════
            '/workflows/{workOrderId}': {
                get: {
                    tags: ['Workflows'], summary: 'Get workflow steps for work order',
                    parameters: [{ name: 'workOrderId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Workflow with steps' } }
                }
            },
            '/workflows/{workOrderId}/steps': {
                post: {
                    tags: ['Workflows'], summary: 'Add workflow step',
                    parameters: [{ name: 'workOrderId', in: 'path', required: true, schema: { type: 'string' } }],
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['step_name', 'step_order'], properties: { step_order: { type: 'integer' }, step_name: { type: 'string' }, step_description: { type: 'string' }, assigned_machine_id: { type: 'string' } } } } } },
                    responses: { '201': { description: 'Step added' } }
                }
            },
            '/workflows/{workOrderId}/steps/bulk': {
                post: {
                    tags: ['Workflows'], summary: 'Bulk add workflow steps',
                    parameters: [{ name: 'workOrderId', in: 'path', required: true, schema: { type: 'string' } }],
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['steps'], properties: { steps: { type: 'array', items: { type: 'object', properties: { step_order: { type: 'integer' }, step_name: { type: 'string' }, step_description: { type: 'string' }, assigned_machine_id: { type: 'string' } } } } } } } } },
                    responses: { '201': { description: 'Steps added' } }
                }
            },
            '/workflows/steps/{stepId}': {
                put: {
                    tags: ['Workflows'], summary: 'Update workflow step',
                    parameters: [{ name: 'stepId', in: 'path', required: true, schema: { type: 'integer' } }],
                    requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { step_order: { type: 'integer' }, step_name: { type: 'string' }, step_description: { type: 'string' }, assigned_machine_id: { type: 'string' } } } } } },
                    responses: { '200': { description: 'Step updated' } }
                },
                delete: {
                    tags: ['Workflows'], summary: 'Delete workflow step',
                    parameters: [{ name: 'stepId', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: { '200': { description: 'Step deleted' } }
                }
            },
            '/workflows/steps/{stepId}/status': {
                patch: {
                    tags: ['Workflows'], summary: 'Update step status',
                    parameters: [{ name: 'stepId', in: 'path', required: true, schema: { type: 'integer' } }],
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'] } } } } } },
                    responses: { '200': { description: 'Status updated' } }
                }
            },

            // ═══════════════════════════════════════════════
            // PRODUCTION
            // ═══════════════════════════════════════════════
            '/production': {
                post: {
                    tags: ['Production'], summary: 'Record production data',
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['machine_id'], properties: { machine_id: { type: 'string' }, work_order_id: { type: 'string' }, produced_count: { type: 'integer' }, rejected_count: { type: 'integer' }, timestamp: { type: 'string', format: 'date-time' } } } } } },
                    responses: { '201': { description: 'Production recorded' } }
                }
            },
            '/production/ingest': {
                post: {
                    tags: ['Production'], summary: 'Ingest production data',
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['machine_id'], properties: { machine_id: { type: 'string' }, work_order_id: { type: 'string' }, produced_count: { type: 'integer' }, rejected_count: { type: 'integer' } } } } } },
                    responses: { '200': { description: 'Production ingested' } }
                }
            },

            // ═══════════════════════════════════════════════
            // OPERATORS
            // ═══════════════════════════════════════════════
            '/operator/checklist': {
                get: { tags: ['Operators'], summary: 'Get machine status checklist (all machines)', responses: { '200': { description: 'Machine status list' } } }
            },
            '/operator/checklist/update': {
                post: {
                    tags: ['Operators'], summary: 'Update machine status',
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/MachineStatusUpdate' } } } },
                    responses: { '200': { description: 'Status updated' } }
                }
            },
            '/operator/rejections': {
                post: {
                    tags: ['Operators'], summary: 'Upload part rejection',
                    requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', required: ['machine_id', 'rejection_reason'], properties: { machine_id: { type: 'string', example: 'MACH-A1B2C3D4' }, work_order_id: { type: 'string', example: 'WO-3FA91D2B' }, rejection_reason: { type: 'string', example: 'Edge crack on part' }, rework_reason: { type: 'string', enum: ['SCRATCH_MARK', 'OILY_CONTENT'], example: 'SCRATCH_MARK' }, part_description: { type: 'string', example: 'Pressure cooker lid outer ring' }, supervisor_name: { type: 'string', example: 'Supervisor Ravi' }, rejected_count: { type: 'integer', default: 1, example: 2 }, part_image: { type: 'string', format: 'binary' } } } } } },
                    responses: { '201': { description: 'Rejection reported' } }
                },
                get: { tags: ['Operators'], summary: 'Get all rejections', responses: { '200': { description: 'All rejections' } } }
            },
            '/operator/rejections/{machineId}': {
                post: {
                    tags: ['Operators'], summary: 'Upload part rejection for specific machine',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', required: ['rejection_reason'], properties: { work_order_id: { type: 'string', example: 'WO-3FA91D2B' }, rejection_reason: { type: 'string', example: 'Edge crack on part' }, rework_reason: { type: 'string', enum: ['SCRATCH_MARK', 'OILY_CONTENT'], example: 'OILY_CONTENT' }, part_description: { type: 'string', example: 'Pressure cooker lid outer ring' }, supervisor_name: { type: 'string', example: 'Supervisor Ravi' }, rejected_count: { type: 'integer', default: 1, example: 2 }, part_image: { type: 'string', format: 'binary' } } } } } },
                    responses: { '201': { description: 'Rejection reported' }, '404': { description: 'Machine not found' } }
                }
            },
            '/operator/rejections/rework-reasons': {
                get: {
                    tags: ['Operators'], summary: 'Get allowed rework reasons',
                    responses: { '200': { description: 'Allowed rework reasons (SCRATCH_MARK, OILY_CONTENT)' } }
                }
            },
            '/operator/rejections/machine/{machineId}': {
                get: {
                    tags: ['Operators'], summary: 'Get rejections by machine',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Machine rejections' } }
                }
            },
            '/operator/rejections/machine/{machineId}/rework/pending': {
                get: {
                    tags: ['Operators'], summary: 'Get pending rework rejected parts for machine',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Machine-wise pending rework rejected parts' }, '404': { description: 'Machine not found' } }
                }
            },
            '/operator/rejections/{rejectionId}/rework': {
                patch: {
                    tags: ['Operators'], summary: 'Mark rejected part as reworked',
                    parameters: [{ name: 'rejectionId', in: 'path', required: true, schema: { type: 'integer' } }],
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['rework_reason'], properties: { rework_reason: { type: 'string', enum: ['SCRATCH_MARK', 'OILY_CONTENT'] }, rework_comments: { type: 'string', example: 'Surface cleaned and polished' } } } } } },
                    responses: { '200': { description: 'Rework marked completed' }, '404': { description: 'Rejected part not found' } }
                }
            },
            '/operator/skills': {
                post: {
                    tags: ['Operators'], summary: 'Update operator skills',
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['operator_name', 'skill_set'], properties: { operator_name: { type: 'string' }, skill_set: { type: 'string' } } } } } },
                    responses: { '200': { description: 'Skills updated' } }
                },
                get: { tags: ['Operators'], summary: 'Get all operator skills', responses: { '200': { description: 'All skills' } } }
            },
            '/operator/skills/me': {
                get: { tags: ['Operators'], summary: 'Get my skills', responses: { '200': { description: 'Current operator skills' } } }
            },
            '/operator/assign': {
                post: {
                    tags: ['Operators'], summary: 'Assign operator to machine',
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['machine_id'], properties: { machine_id: { type: 'string' }, mentor_name: { type: 'string' } } } } } },
                    responses: { '200': { description: 'Assigned' } }
                }
            },
            '/operator/assign/{machineId}': {
                delete: {
                    tags: ['Operators'], summary: 'Unassign operator from machine',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Unassigned' } }
                }
            },
            '/operator/my-machines': {
                get: { tags: ['Operators'], summary: 'Get my assigned machines', responses: { '200': { description: 'Operator machines' } } }
            },
            '/operator/machine-operators/{machineId}': {
                get: {
                    tags: ['Operators'], summary: 'Get operators assigned to a machine',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Machine operators' } }
                }
            },
            '/operator/assignments': {
                get: { tags: ['Operators'], summary: 'Get all machine-operator assignments', responses: { '200': { description: 'All assignments' } } }
            },
            '/operator/breakdowns': {
                post: {
                    tags: ['Operators'], summary: 'Report machine breakdown (legacy body machine_id)',
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['machine_id', 'breakdown_reason'], properties: { machine_id: { type: 'string' }, breakdown_reason: { type: 'string', enum: ['TOOL_CHANGER', 'MACHINE_BREAKDOWN', 'MONTHLY_PM', 'QC_ISSUES', 'CORRECTION', 'WAITING_FOR_RM', 'POWER_CUT', 'SHIFT_CHANGE', 'NO_OPERATOR', 'OTHERS'] }, start_time: { type: 'string', format: 'date-time' }, end_time: { type: 'string', format: 'date-time' }, comment: { type: 'string' }, severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] } } } } } },
                    responses: { '201': { description: 'Breakdown reported' } }
                },
                get: { tags: ['Operators'], summary: 'Get all breakdowns', responses: { '200': { description: 'All breakdowns' } } }
            },
            '/operator/breakdowns/reasons': {
                get: {
                    tags: ['Operators'], summary: 'Get common machine breakdown reasons',
                    responses: { '200': { description: 'List of allowed common breakdown reasons' } }
                }
            },
            '/operator/breakdowns/{machineId}': {
                post: {
                    tags: ['Operators'], summary: 'Report machine breakdown by machineId',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['breakdown_reason'], properties: { breakdown_reason: { type: 'string', enum: ['TOOL_CHANGER', 'MACHINE_BREAKDOWN', 'MONTHLY_PM', 'QC_ISSUES', 'CORRECTION', 'WAITING_FOR_RM', 'POWER_CUT', 'SHIFT_CHANGE', 'NO_OPERATOR', 'OTHERS'] }, start_time: { type: 'string', format: 'date-time' }, end_time: { type: 'string', format: 'date-time' }, comment: { type: 'string' }, severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] } } } } } },
                    responses: { '201': { description: 'Breakdown reported for machine' }, '404': { description: 'Machine not found' } }
                }
            },
            '/operator/breakdowns/{breakdownId}/status': {
                patch: {
                    tags: ['Operators'], summary: 'Update breakdown status',
                    parameters: [{ name: 'breakdownId', in: 'path', required: true, schema: { type: 'integer' } }],
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['REPORTED', 'ACKNOWLEDGED', 'IN_REPAIR', 'RESOLVED'] } } } } } },
                    responses: { '200': { description: 'Status updated' } }
                }
            },
            '/operator/breakdowns/machine/{machineId}': {
                get: {
                    tags: ['Operators'], summary: 'Get breakdowns by machine',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Machine breakdowns' } }
                }
            },
            '/operator/breakdowns/active': {
                get: { tags: ['Operators'], summary: 'Get active breakdowns', responses: { '200': { description: 'Active breakdowns' } } }
            },


            // ═══════════════════════════════════════════════
            // DASHBOARD
            // ═══════════════════════════════════════════════
            '/dashboard/overview': {
                get: { tags: ['Dashboard'], summary: 'Get business dashboard overview (work orders, machines, production)', responses: { '200': { description: 'Dashboard overview data' } } }
            },
            '/dashboard/work-orders': {
                get: { tags: ['Dashboard'], summary: 'Get work order status with production data', responses: { '200': { description: 'Work order status list with completion percentages' } } }
            },

            // ═══════════════════════════════════════════════
            // NOTIFICATIONS
            // ═══════════════════════════════════════════════
            '/notifications': {
                get: {
                    tags: ['Notifications'], summary: 'Get notifications (business users only)',
                    parameters: [{ name: 'machine_id', in: 'query', schema: { type: 'string' } }],
                    responses: {
                        '200': { description: 'Notifications list' },
                        '403': { description: 'Unauthorized access. Only business users are allowed for notifications.' }
                    }
                },
                post: {
                    tags: ['Notifications'], summary: 'Create notification (business users only)',
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['title', 'message'], properties: { title: { type: 'string' }, message: { type: 'string' }, type: { type: 'string', enum: ['INFO', 'WARNING', 'ERROR', 'SUCCESS'] }, machine_id: { type: 'string' }, user_id: { type: 'integer' }, user_type: { type: 'string', enum: ['business', 'operator'] } } } } } },
                    responses: {
                        '201': { description: 'Notification created' },
                        '403': { description: 'Unauthorized access. Only business users are allowed for notifications.' }
                    }
                },
                delete: {
                    tags: ['Notifications'], summary: 'Delete all notifications (business users only)', responses: {
                        '200': { description: 'All notifications deleted' },
                        '403': { description: 'Unauthorized access. Only business users are allowed for notifications.' }
                    }
                }
            },
            '/notifications/{id}': {
                delete: {
                    tags: ['Notifications'], summary: 'Delete a single notification (business users only)',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: {
                        '200': { description: 'Notification deleted' },
                        '403': { description: 'Unauthorized access. Only business users are allowed for notifications.' }
                    }
                }
            },
            '/notifications/{id}/read': {
                patch: {
                    tags: ['Notifications'], summary: 'Mark notification as read (business users only)',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: {
                        '200': { description: 'Marked as read' },
                        '403': { description: 'Unauthorized access. Only business users are allowed for notifications.' }
                    }
                }
            },



            // ═══════════════════════════════════════════════
            // ALERTS
            // ═══════════════════════════════════════════════
            '/alerts': {
                get: { tags: ['Alerts'], summary: 'Get system alerts (active breakdowns, low stock, etc.)', responses: { '200': { description: 'System alerts' } } }
            }
        }
    },
    apis: []
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;
