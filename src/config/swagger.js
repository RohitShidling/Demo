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
            }
        },
        security: [{ bearerAuth: [] }],
        tags: [
            { name: 'Business Auth', description: 'Business/Admin level authentication APIs' },
            { name: 'Operator Auth', description: 'Operator level authentication APIs' },
            { name: 'Machines', description: 'Machine management, OEE, downtime, and data ingestion' },
            { name: 'Machine Checklist', description: 'Machine checklists - safety, cleaning, lubrication check sheets' },
            { name: 'Work Orders', description: 'Work order CRUD, machine assignment, and production tracking' },
            { name: 'Workflows', description: 'Workflow steps management for work orders' },
            { name: 'Production', description: 'Production recording and ingestion' },
            { name: 'Operators', description: 'Operator checklist, rejections, skills, assignments, breakdowns' },
            { name: 'Shifts', description: 'Shift management and operator assignment' },
            { name: 'Inventory', description: 'Inventory materials and consumption tracking' },
            { name: 'Quality', description: 'Quality inspections and reports' },
            { name: 'Scheduling', description: 'Production scheduling and planning' },
            { name: 'Dashboard', description: 'Business dashboard overview and analytics' },
            { name: 'Notifications', description: 'Notification management' },
            { name: 'Audit Logs', description: 'System audit trail' },
            { name: 'Alerts', description: 'System alerts and warnings' }
        ],
        paths: {
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
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string' }, password: { type: 'string' } } } } } },
                    responses: { '200': { description: 'Login successful, returns accessToken and refreshToken' }, '401': { description: 'Invalid credentials' } }
                }
            },
            '/business/auth/logout': {
                post: { tags: ['Business Auth'], summary: 'Logout business user', responses: { '200': { description: 'Logged out' } } }
            },
            '/business/auth/refresh': {
                post: {
                    tags: ['Business Auth'], summary: 'Refresh access token', security: [],
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } } } } },
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
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string' }, password: { type: 'string' } } } } } },
                    responses: { '200': { description: 'Login successful' }, '401': { description: 'Invalid credentials' } }
                }
            },
            '/operator/auth/logout': {
                post: { tags: ['Operator Auth'], summary: 'Logout operator', responses: { '200': { description: 'Logged out' } } }
            },
            '/operator/auth/refresh': {
                post: {
                    tags: ['Operator Auth'], summary: 'Refresh operator token', security: [],
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } } } } },
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
                    tags: ['Machines'], summary: 'Get machine details',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Machine details' }, '404': { description: 'Machine not found' } }
                }
            },
            '/machines/{machineId}/visualization': {
                get: {
                    tags: ['Machines'], summary: 'Get machine visualization data',
                    parameters: [
                        { name: 'machineId', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'filter', in: 'query', schema: { type: 'string', enum: ['today', 'week', 'month', 'custom'] } },
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
            '/machines/{machineId}/oee': {
                get: {
                    tags: ['Machines'], summary: 'Get machine OEE (Overall Equipment Effectiveness)',
                    parameters: [
                        { name: 'machineId', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'time_range', in: 'query', schema: { type: 'string', enum: ['today', 'week', 'month'], default: 'today' } }
                    ],
                    responses: { '200': { description: 'OEE data with availability, performance, quality' } }
                }
            },
            '/machines/{machineId}/oee/history': {
                get: {
                    tags: ['Machines'], summary: 'Get OEE history',
                    parameters: [
                        { name: 'machineId', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'filter', in: 'query', schema: { type: 'string', enum: ['daily', 'weekly', 'monthly'], default: 'daily' } }
                    ],
                    responses: { '200': { description: 'OEE history data' } }
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
                get: { tags: ['Machine Checklist'], summary: 'Get checklist summary (completion stats per machine)', responses: { '200': { description: 'Summary data' } } }
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
                    requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', properties: { checkpoint: { type: 'string' }, description: { type: 'string' }, specification: { type: 'string' }, method: { type: 'string' }, image: { type: 'string', format: 'binary' }, timing: { type: 'string' }, status: { type: 'string', enum: ['PENDING', 'OK', 'NOT_OK', 'NA'] }, comments: { type: 'string' }, sort_order: { type: 'integer' } } } } } },
                    responses: { '200': { description: 'Item updated' }, '404': { description: 'Item not found' } }
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
                    responses: { '200': { description: 'Machine checklist with items ordered by sort_order' }, '404': { description: 'Machine not found' } }
                },
                post: {
                    tags: ['Machine Checklist'], summary: 'Create a new checklist item for a machine',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', required: ['checkpoint'], properties: { checkpoint: { type: 'string', example: 'Cleanliness Check' }, description: { type: 'string', example: 'Check machine surface cleanliness' }, specification: { type: 'string', example: 'No visible dust or debris' }, method: { type: 'string', example: 'Visual Inspection' }, image: { type: 'string', format: 'binary' }, timing: { type: 'string', example: 'Before Shift' }, status: { type: 'string', enum: ['PENDING', 'OK', 'NOT_OK', 'NA'], default: 'PENDING' }, comments: { type: 'string' }, sort_order: { type: 'integer' } } } } } },
                    responses: { '201': { description: 'Item created' }, '400': { description: 'checkpoint is required' }, '404': { description: 'Machine not found' } }
                }
            },
            '/checklist/{machineId}/bulk': {
                post: {
                    tags: ['Machine Checklist'], summary: 'Bulk create checklist items for a machine',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['items'], properties: { items: { type: 'array', items: { type: 'object', required: ['checkpoint'], properties: { checkpoint: { type: 'string' }, description: { type: 'string' }, specification: { type: 'string' }, method: { type: 'string' }, image: { type: 'string', description: 'Base64 encoded image' }, timing: { type: 'string' }, status: { type: 'string', enum: ['PENDING', 'OK', 'NOT_OK', 'NA'] }, comments: { type: 'string' }, sort_order: { type: 'integer' } } } } } } } } },
                    responses: { '201': { description: 'Items created' } }
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
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['work_order_name', 'target'], properties: { work_order_name: { type: 'string', example: 'Batch 2026-Q1' }, target: { type: 'integer', example: 1000 }, description: { type: 'string' } } } } } },
                    responses: { '201': { description: 'Work order created' } }
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
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['machine_id'], properties: { machine_id: { type: 'string' } } } } } },
                    responses: { '200': { description: 'Machine assigned' } }
                },
                get: {
                    tags: ['Work Orders'], summary: 'Get machines assigned to work order',
                    parameters: [{ name: 'workOrderId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'List of assigned machines' } }
                }
            },
            '/work-orders/{workOrderId}/machines/{machineId}': {
                delete: {
                    tags: ['Work Orders'], summary: 'Unassign machine from work order',
                    parameters: [
                        { name: 'workOrderId', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }
                    ],
                    responses: { '200': { description: 'Machine unassigned' } }
                }
            },
            '/work-orders/{workOrderId}/rejections': {
                get: {
                    tags: ['Work Orders'], summary: 'Get rejections for work order',
                    parameters: [{ name: 'workOrderId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Work order rejections' } }
                }
            },
            '/work-orders/{workOrderId}/production-summary': {
                get: {
                    tags: ['Work Orders'], summary: 'Get production summary for work order',
                    parameters: [{ name: 'workOrderId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Production summary from production_logs' } }
                }
            },
            '/work-orders/{workOrderId}/machine-production': {
                get: {
                    tags: ['Work Orders'], summary: 'Get per-machine production for work order',
                    parameters: [{ name: 'workOrderId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Machine-wise production data' } }
                }
            },
            '/work-orders/{workOrderId}/summary': {
                get: {
                    tags: ['Work Orders'], summary: 'Get work order final summary',
                    parameters: [
                        { name: 'workOrderId', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'group_by', in: 'query', schema: { type: 'string' } }
                    ],
                    responses: { '200': { description: 'Final summary' } }
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
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['machine_id', 'status'], properties: { machine_id: { type: 'string' }, status: { type: 'string', enum: ['RUNNING', 'STOPPED', 'MAINTENANCE', 'NOT_STARTED'] } } } } } },
                    responses: { '200': { description: 'Status updated' } }
                }
            },
            '/operator/rejections': {
                post: {
                    tags: ['Operators'], summary: 'Upload part rejection',
                    requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', required: ['machine_id', 'rejection_reason'], properties: { machine_id: { type: 'string' }, work_order_id: { type: 'string' }, rejection_reason: { type: 'string' }, rejected_count: { type: 'integer', default: 1 }, part_image: { type: 'string', format: 'binary' } } } } } },
                    responses: { '201': { description: 'Rejection reported' } }
                },
                get: { tags: ['Operators'], summary: 'Get all rejections', responses: { '200': { description: 'All rejections' } } }
            },
            '/operator/rejections/machine/{machineId}': {
                get: {
                    tags: ['Operators'], summary: 'Get rejections by machine',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Machine rejections' } }
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
                    tags: ['Operators'], summary: 'Report machine breakdown',
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['machine_id', 'problem_description'], properties: { machine_id: { type: 'string' }, problem_description: { type: 'string' }, severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] } } } } } },
                    responses: { '201': { description: 'Breakdown reported' } }
                },
                get: { tags: ['Operators'], summary: 'Get all breakdowns', responses: { '200': { description: 'All breakdowns' } } }
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
            // SHIFTS
            // ═══════════════════════════════════════════════
            '/shifts': {
                post: {
                    tags: ['Shifts'], summary: 'Create a shift',
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['shift_name', 'start_time', 'end_time'], properties: { shift_name: { type: 'string', example: 'Morning' }, start_time: { type: 'string', example: '06:00:00' }, end_time: { type: 'string', example: '14:00:00' } } } } } },
                    responses: { '201': { description: 'Shift created' } }
                },
                get: { tags: ['Shifts'], summary: 'Get all shifts', responses: { '200': { description: 'List of shifts' } } }
            },
            '/shifts/current': {
                get: { tags: ['Shifts'], summary: 'Get current active shift', responses: { '200': { description: 'Current shift or no active shift message' } } }
            },
            '/shifts/assign': {
                post: {
                    tags: ['Shifts'], summary: 'Assign operator to shift',
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['operator_id', 'shift_id', 'date'], properties: { operator_id: { type: 'integer' }, shift_id: { type: 'integer' }, date: { type: 'string', format: 'date' } } } } } },
                    responses: { '201': { description: 'Operator assigned to shift' } }
                }
            },
            '/shifts/{shiftId}/performance': {
                get: {
                    tags: ['Shifts'], summary: 'Get shift performance metrics',
                    parameters: [{ name: 'shiftId', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: { '200': { description: 'Shift performance data' } }
                }
            },

            // ═══════════════════════════════════════════════
            // INVENTORY
            // ═══════════════════════════════════════════════
            '/inventory/materials': {
                post: {
                    tags: ['Inventory'], summary: 'Add material to inventory',
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['material_name'], properties: { material_name: { type: 'string' }, quantity: { type: 'number' }, unit: { type: 'string', default: 'pcs' } } } } } },
                    responses: { '201': { description: 'Material added' } }
                },
                get: { tags: ['Inventory'], summary: 'Get all materials', responses: { '200': { description: 'Materials list' } } }
            },
            '/inventory/consume': {
                post: {
                    tags: ['Inventory'], summary: 'Consume material from inventory',
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['material_id', 'quantity_used'], properties: { material_id: { type: 'integer' }, work_order_id: { type: 'string' }, quantity_used: { type: 'number' } } } } } },
                    responses: { '200': { description: 'Material consumed' }, '400': { description: 'Insufficient stock' } }
                }
            },

            // ═══════════════════════════════════════════════
            // QUALITY
            // ═══════════════════════════════════════════════
            '/quality/inspection': {
                post: {
                    tags: ['Quality'], summary: 'Record quality inspection',
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['machine_id'], properties: { machine_id: { type: 'string' }, work_order_id: { type: 'string' }, parameters: { type: 'object' }, status: { type: 'string', enum: ['PASS', 'FAIL'] }, remarks: { type: 'string' } } } } } },
                    responses: { '201': { description: 'Inspection recorded' } }
                }
            },
            '/quality/reports': {
                get: {
                    tags: ['Quality'], summary: 'Get quality reports',
                    parameters: [
                        { name: 'work_order_id', in: 'query', schema: { type: 'string' } },
                        { name: 'machine_id', in: 'query', schema: { type: 'string' } }
                    ],
                    responses: { '200': { description: 'Quality reports' } }
                }
            },

            // ═══════════════════════════════════════════════
            // SCHEDULING
            // ═══════════════════════════════════════════════
            '/scheduling/plan': {
                post: {
                    tags: ['Scheduling'], summary: 'Create production plan',
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['work_order_id', 'machine_id', 'start_time', 'end_time'], properties: { work_order_id: { type: 'string' }, machine_id: { type: 'string' }, start_time: { type: 'string', format: 'date-time' }, end_time: { type: 'string', format: 'date-time' } } } } } },
                    responses: { '201': { description: 'Plan created' } }
                }
            },
            '/scheduling': {
                get: { tags: ['Scheduling'], summary: 'Get full production schedule', responses: { '200': { description: 'Schedule list' } } }
            },
            '/scheduling/machine/{machineId}': {
                get: {
                    tags: ['Scheduling'], summary: 'Get schedule for a specific machine',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Machine schedule' } }
                }
            },

            // ═══════════════════════════════════════════════
            // DASHBOARD
            // ═══════════════════════════════════════════════
            '/dashboard/overview': {
                get: { tags: ['Dashboard'], summary: 'Get business dashboard overview (work orders, machines, production, OEE)', responses: { '200': { description: 'Dashboard overview data' } } }
            },
            '/dashboard/work-orders': {
                get: { tags: ['Dashboard'], summary: 'Get work order status with production data', responses: { '200': { description: 'Work order status list with completion percentages' } } }
            },

            // ═══════════════════════════════════════════════
            // NOTIFICATIONS
            // ═══════════════════════════════════════════════
            '/notifications': {
                get: { tags: ['Notifications'], summary: 'Get notifications for current user', responses: { '200': { description: 'Notifications list' } } },
                post: {
                    tags: ['Notifications'], summary: 'Create notification',
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['title', 'message'], properties: { title: { type: 'string' }, message: { type: 'string' }, type: { type: 'string', enum: ['INFO', 'WARNING', 'ERROR', 'SUCCESS'] }, user_id: { type: 'integer' }, user_type: { type: 'string', enum: ['business', 'operator'] } } } } } },
                    responses: { '201': { description: 'Notification created' } }
                }
            },
            '/notifications/{id}/read': {
                patch: {
                    tags: ['Notifications'], summary: 'Mark notification as read',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: { '200': { description: 'Marked as read' } }
                }
            },

            // ═══════════════════════════════════════════════
            // AUDIT LOGS
            // ═══════════════════════════════════════════════
            '/audit-logs': {
                get: {
                    tags: ['Audit Logs'], summary: 'Get audit logs',
                    parameters: [
                        { name: 'limit', in: 'query', schema: { type: 'integer', default: 100 } },
                        { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
                        { name: 'entity_type', in: 'query', schema: { type: 'string' } },
                        { name: 'entity_id', in: 'query', schema: { type: 'string' } }
                    ],
                    responses: { '200': { description: 'Audit logs' } }
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
