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
                },
                // Standard success envelope used across most controllers
                SuccessResponse: {
                    description: 'Success response. Some endpoints return an envelope {success,data,...} while others return raw JSON (object/array).',
                    oneOf: [
                        {
                            type: 'object',
                            properties: {
                                success: { type: 'boolean', example: true },
                                message: { type: 'string', example: 'Operation completed successfully' },
                                statusCode: { type: 'integer', example: 200 },
                                data: {
                                    description: 'Response payload (varies per endpoint)',
                                    oneOf: [
                                        { type: 'object', additionalProperties: true, example: {} },
                                        { type: 'array', items: { type: 'object', additionalProperties: true }, example: [{ }] }
                                    ]
                                },
                                pagination: {
                                    type: 'object',
                                    properties: {
                                        currentPage: { type: 'integer', example: 1 },
                                        itemsPerPage: { type: 'integer', example: 10 },
                                        totalItems: { type: 'integer', example: 100 },
                                        totalPages: { type: 'integer', example: 10 }
                                    },
                                    additionalProperties: true
                                },
                                conflict: { type: 'object', additionalProperties: true }
                            },
                            additionalProperties: true
                        },
                        {
                            type: 'object',
                            additionalProperties: true,
                            example: { status: 'received' }
                        },
                        {
                            type: 'array',
                            items: { type: 'object', additionalProperties: true },
                            example: [{ hour_start: '2026-04-29T08:00:00.000Z', count: 0 }]
                        }
                    ]
                },
                // Standard error envelope used across most errors
                ErrorResponse: {
                    type: 'object',
                    required: ['message'],
                    properties: {
                        success: { type: 'boolean', example: false },
                        message: { type: 'string', example: 'Validation failed' },
                        statusCode: { type: 'integer', example: 400 },
                        errors: {
                            description: 'Validation or field errors (shape varies)',
                            oneOf: [
                                { type: 'array', items: { type: 'object', additionalProperties: true }, example: [{ field: 'email', message: 'Invalid email' }] },
                                { type: 'object', additionalProperties: true, example: { field: 'email', message: 'Invalid email' } }
                            ]
                        },
                        conflict: {
                            type: 'object',
                            additionalProperties: true,
                            example: {
                                conflicting_work_order_id: 'WO-2026-001',
                                conflicting_work_order_name: 'Sample Work Order',
                                action_required: "Unassign machine from work order 'WO-2026-001' first, then reassign."
                            }
                        },
                        debug: {
                            description: 'Only included in development',
                            type: 'object',
                            additionalProperties: true,
                            nullable: true,
                            example: { stack: '...', error: {} }
                        }
                    },
                    additionalProperties: true
                },

                // ─────────────────────────────────────────────────────────────
                // Machine response payload schemas (for richer Swagger output)
                // ─────────────────────────────────────────────────────────────
                MachineHistoryItem: {
                    type: 'object',
                    additionalProperties: true,
                    properties: {
                        hour_start: { type: 'string', format: 'date-time', example: '2026-04-29T08:00:00.000Z' },
                        hour_end: { type: 'string', format: 'date-time', example: '2026-04-29T09:00:00.000Z' },
                        count: { type: 'integer', example: 42 },
                        accepted: { type: 'integer', example: 40 },
                        rejected: { type: 'integer', example: 2 },
                        run_id: { type: 'integer', example: 17 }
                    }
                },
                MachineIngestResponse: {
                    type: 'object',
                    properties: {
                        status: { type: 'string', example: 'received' }
                    },
                    required: ['status'],
                    additionalProperties: false
                },
                MachineStopResponse: {
                    type: 'object',
                    properties: {
                        status: { type: 'string', example: 'stopped' }
                    },
                    required: ['status'],
                    additionalProperties: false
                },
                MachineDashboardCurrentRun: {
                    type: 'object',
                    additionalProperties: true,
                    properties: {
                        start_time: { type: 'string', format: 'date-time', example: '2026-04-29T08:00:00.000Z' },
                        total_count: { type: 'integer', example: 120 },
                        accepted_count: { type: 'integer', example: 118 },
                        rejected_count: { type: 'integer', example: 2 },
                        last_activity: { type: 'string', format: 'date-time', example: '2026-04-29T08:59:59.000Z' }
                    }
                },
                MachineDashboard: {
                    type: 'object',
                    additionalProperties: true,
                    properties: {
                        machine_id: { type: 'string', example: 'MACH-A1B2C3D4' },
                        machine_name: { type: 'string', example: 'CNC Machine 1' },
                        machine_image: { type: ['string', 'null'], description: 'Base64 encoded image', example: 'iVBORw0KGgo...' },
                        ingest_path: { type: 'string', example: '/cnc1' },
                        status: { type: 'string', example: 'RUNNING' },
                        total_rejected: { type: 'integer', example: 10 },
                        current_run: { $ref: '#/components/schemas/MachineDashboardCurrentRun' }
                    }
                },
                DowntimeAnalysisData: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        total_downtime_minutes: { type: 'integer', example: 240 },
                        planned_downtime: { type: 'integer', example: 120 },
                        unplanned_downtime: { type: 'integer', example: 120 },
                        mttr: { type: 'integer', example: 30 },
                        mtbf: { type: 'integer', example: 1440 }
                    }
                },
                HourlyProductionSlot: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        hour_label: { type: 'string', example: '08:00' },
                        hour_start: { type: 'string', format: 'date-time', example: '2026-04-29T08:00:00.000Z' },
                        hour_end: { type: 'string', format: 'date-time', example: '2026-04-29T09:00:00.000Z' },
                        total_count: { type: 'integer', example: 12 },
                        accepted_count: { type: 'integer', example: 10 },
                        rejected_count: { type: 'integer', example: 2 }
                    }
                },
                HourlyProductionData: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        machine_id: { type: 'string', example: 'MACH-A1B2C3D4' },
                        machine_name: { type: 'string', example: 'CNC Machine 1' },
                        period: { type: 'string', example: 'last_24_hours' },
                        slots: { type: 'array', items: { $ref: '#/components/schemas/HourlyProductionSlot' } }
                    }
                },
                DailyProductionDay: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        date: { type: 'string', format: 'date', example: '2026-04-29' },
                        day: { type: 'integer', example: 29 },
                        month: { type: 'integer', example: 4 },
                        year: { type: 'integer', example: 2026 },
                        day_label: { type: 'string', example: '29 Apr' },
                        total_count: { type: 'integer', example: 120 },
                        accepted_count: { type: 'integer', example: 115 },
                        rejected_count: { type: 'integer', example: 5 }
                    }
                },
                DailyProductionData: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        machine_id: { type: 'string', example: 'MACH-A1B2C3D4' },
                        machine_name: { type: 'string', example: 'CNC Machine 1' },
                        period: { type: 'string', example: 'last_31_days' },
                        start_date: { type: 'string', format: 'date', example: '2026-03-30' },
                        end_date: { type: 'string', format: 'date', example: '2026-04-29' },
                        days: { type: 'array', items: { $ref: '#/components/schemas/DailyProductionDay' } }
                    }
                },
                CustomProductionMonthEntry: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        month: { type: 'string', example: '2026-04' },
                        month_label: { type: 'string', example: 'Apr 2026' },
                        production: { type: 'integer', example: 3200 },
                        total_count: { type: 'integer', example: 3200 },
                        accepted_count: { type: 'integer', example: 3150 },
                        rejected_count: { type: 'integer', example: 50 }
                    }
                },
                CustomProductionData: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        machine_id: { type: 'string', example: 'MACH-A1B2C3D4' },
                        machine_name: { type: 'string', example: 'CNC Machine 1' },
                        period: { type: 'string', example: 'custom' },
                        start_date: { type: 'string', format: 'date', example: '2026-04-01' },
                        end_date: { type: 'string', format: 'date', example: '2026-04-21' },
                        total_months: { type: 'integer', example: 1 },
                        months: { type: 'array', items: { $ref: '#/components/schemas/CustomProductionMonthEntry' } }
                    }
                },
                MachineVisualizationHourlyItem: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        hour_label: { type: 'string', example: '08:00' },
                        hour_start: { type: 'string', format: 'date-time', example: '2026-04-29T08:00:00.000Z' },
                        hour_end: { type: 'string', format: 'date-time', example: '2026-04-29T09:00:00.000Z' },
                        production_count: { type: 'integer', example: 12 },
                        accepted_count: { type: 'integer', example: 10 },
                        rejected_count: { type: 'integer', example: 2 },
                        run_id: { type: 'integer', example: 17 }
                    }
                },
                MachineVisualizationDayItem: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        date: { type: 'string', format: 'date', example: '2026-04-29' },
                        day: { type: 'integer', example: 29 },
                        production_count: { type: 'integer', example: 120 },
                        accepted_count: { type: 'integer', example: 115 },
                        rejected_count: { type: 'integer', example: 5 }
                    }
                },
                MachineVisualizationData: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        machine_id: { type: 'string', example: 'MACH-A1B2C3D4' },
                        machine_name: { type: 'string', example: 'CNC Machine 1' },
                        filter: { type: 'string', example: 'daily' },
                        visualization: {
                            type: 'object',
                            additionalProperties: false,
                            properties: {
                                hourly: { type: 'array', items: { $ref: '#/components/schemas/MachineVisualizationHourlyItem' } },
                                daily: { type: 'array', items: { $ref: '#/components/schemas/MachineVisualizationDayItem' } },
                                calendar: { type: 'array', items: { $ref: '#/components/schemas/MachineVisualizationDayItem' } }
                            }
                        }
                    }
                },
                MachineDowntimeRecord: {
                    type: 'object',
                    additionalProperties: true,
                    properties: {
                        id: { type: 'integer', example: 401 },
                        machine_id: { type: 'string', example: 'MACH-A1B2C3D4' },
                        reason: { type: ['string', 'null'], example: 'QC_ISSUES' },
                        severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], example: 'MEDIUM' },
                        start_time: { type: 'string', format: 'date-time', example: '2026-04-29T10:00:00.000Z' },
                        end_time: { type: ['string', 'null'], format: 'date-time', example: '2026-04-29T10:30:00.000Z' },
                        created_at: { type: 'string', format: 'date-time', example: '2026-04-29T10:00:01.000Z' },
                        updated_at: { type: 'string', format: 'date-time', example: '2026-04-29T10:30:01.000Z' },
                        status: { type: ['string', 'null'], example: 'ACTIVE' }
                    }
                },
                MachineOperatorItem: {
                    type: 'object',
                    additionalProperties: true,
                    properties: {
                        id: { type: 'integer', example: 33 },
                        machine_id: { type: 'string', example: 'MACH-A1B2C3D4' },
                        operator_id: { type: 'integer', example: 7 },
                        mentor_name: { type: ['string', 'null'], example: 'Ravi Kumar' },
                        is_active: { type: 'boolean', example: true },
                        assigned_at: { type: 'string', format: 'date-time', example: '2026-04-29T08:00:00.000Z' },
                        operator_name: { type: 'string', example: 'Prakash S' },
                        operator_email: { type: 'string', example: 'op@mes.com' }
                    }
                },
                MachineBreakdownItem: {
                    type: 'object',
                    additionalProperties: true,
                    properties: {
                        id: { type: 'integer', example: 91 },
                        machine_id: { type: 'string', example: 'MACH-A1B2C3D4' },
                        operator_id: { type: 'integer', example: 7 },
                        problem_description: { type: 'string', example: 'Vibration spike detected' },
                        severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], example: 'HIGH' },
                        breakdown_reason: { type: ['string', 'null'], example: 'QC_ISSUES' },
                        start_time: { type: ['string', 'null'], format: 'date-time', example: '2026-04-29T09:12:00.000Z' },
                        end_time: { type: ['string', 'null'], format: 'date-time', example: '2026-04-29T09:30:00.000Z' },
                        comment: { type: ['string', 'null'], example: 'Awaiting tool change' },
                        status: { type: 'string', example: 'REPORTED' },
                        reported_at: { type: 'string', format: 'date-time', example: '2026-04-29T09:12:15.000Z' },
                        resolved_at: { type: ['string', 'null'], format: 'date-time', example: '2026-04-29T10:00:00.000Z' },
                        operator_name: { type: 'string', example: 'Supervisor Ravi' },
                        machine_name: { type: 'string', example: 'CNC Machine 1' }
                    }
                },
                MachineDetailsData: {
                    type: 'object',
                    additionalProperties: true,
                    properties: {
                        machine_id: { type: 'string', example: 'MACH-A1B2C3D4' },
                        machine_name: { type: 'string', example: 'CNC Machine 1' },
                        machine_image: { type: ['string', 'null'], example: 'iVBORw0KGgo...' },
                        ingest_path: { type: 'string', example: '/cnc1' },
                        status: { type: 'string', example: 'RUNNING' },
                        work_order: {
                            oneOf: [
                                { type: 'null' },
                                {
                                    type: 'object',
                                    additionalProperties: true,
                                    properties: {
                                        work_order_id: { type: 'string', example: 'WO-2026-001' },
                                        work_order_name: { type: 'string', example: 'Frying Pan - Batch Q1' },
                                        start_date: { type: ['string', 'null'], format: 'date-time', example: '2026-04-29T08:00:00.000Z' },
                                        targeted_end_date: { type: ['string', 'null'], example: '2026-12-31' },
                                        stage_order: { type: ['integer', 'null'], example: 1 },
                                        status: { type: 'string', example: 'IN_PROGRESS' }
                                    }
                                }
                            ]
                        },
                        production_target: { type: 'integer', example: 1000 },
                        progress_percentage: { type: 'integer', example: 72 },
                        last_start: { type: ['string', 'null'], format: 'date-time', example: '2026-04-29T08:00:00.000Z' },
                        last_part_produced_at: { type: ['string', 'null'], format: 'date-time', example: '2026-04-29T08:55:00.000Z' },
                        total_rejected_all_time: { type: 'integer', example: 10 },
                        operators: { type: 'array', items: { $ref: '#/components/schemas/MachineOperatorItem' } },
                        breakdowns: { type: 'array', items: { $ref: '#/components/schemas/MachineBreakdownItem' } },
                        current_run: {
                            oneOf: [
                                { type: 'null' },
                                {
                                    type: 'object',
                                    additionalProperties: true,
                                    properties: {
                                        run_id: { type: 'integer', example: 17 },
                                        start_time: { type: ['string', 'null'], format: 'date-time', example: '2026-04-29T08:00:00.000Z' },
                                        end_time: { type: ['string', 'null'], format: 'date-time', example: '2026-04-29T08:59:59.000Z' },
                                        total_count: { type: 'integer', example: 120 },
                                        accepted_count: { type: 'integer', example: 118 },
                                        rejected_count: { type: 'integer', example: 2 },
                                        last_activity_time: { type: ['string', 'null'], format: 'date-time', example: '2026-04-29T08:59:59.000Z' },
                                        status: { type: 'string', example: 'RUNNING' }
                                    }
                                }
                            ]
                        }
                    }
                },

                // ─────────────────────────────────────────────────────────────
                // Production / Work Order response payload schemas
                // ─────────────────────────────────────────────────────────────
                ProductionRecordedData: {
                    type: 'object',
                    additionalProperties: true,
                    properties: {
                        production_id: { type: 'integer', example: 123 }
                    }
                },
                WorkOrderProductionSummaryData: {
                    type: 'object',
                    additionalProperties: true,
                    properties: {
                        work_order_id: { type: 'string', example: 'WO-2026-001' },
                        work_order_name: { type: 'string', example: 'Frying Pan - Batch Q1' },
                        target: { type: 'integer', example: 1000 },
                        produced: { type: 'integer', example: 800 },
                        accepted: { type: 'integer', example: 790 },
                        rejected: { type: 'integer', example: 10 },
                        remaining: { type: 'integer', example: 200 },
                        completion_percentage: { type: 'number', format: 'float', example: 80.0 }
                    }
                },
                WorkOrderMachineProductionMachineItem: {
                    type: 'object',
                    additionalProperties: true,
                    properties: {
                        machine_id: { type: 'string', example: 'MACH-A1B2C3D4' },
                        machine_name: { type: 'string', example: 'CNC Machine 1' },
                        stage_order: { type: ['integer', 'null'], example: 2 },
                        is_last_stage: { type: 'boolean', example: true },
                        produced_count: { type: 'integer', example: 800 },
                        accepted_count: { type: 'integer', example: 790 },
                        rejected_count: { type: 'integer', example: 10 }
                    }
                },
                WorkOrderMachineProductionData: {
                    type: 'object',
                    additionalProperties: true,
                    properties: {
                        work_order_id: { type: 'string', example: 'WO-2026-001' },
                        work_order_name: { type: 'string', example: 'Frying Pan - Batch Q1' },
                        machines: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/WorkOrderMachineProductionMachineItem' }
                        },
                        _note: { type: 'string', example: 'WO produced = last-stage machine only.' }
                    }
                },
                WorkOrderFinalSummaryData: {
                    type: 'object',
                    additionalProperties: true,
                    properties: {
                        work_order_id: { type: 'string', example: 'WO-2026-001' },
                        work_order_name: { type: 'string', example: 'Frying Pan - Batch Q1' },
                        status: { type: 'string', example: 'IN_PROGRESS' },
                        target: { type: 'integer', example: 1000 },
                        produced: { type: 'integer', example: 800 },
                        accepted: { type: 'integer', example: 790 },
                        rejected: { type: 'integer', example: 10 },
                        remaining: { type: 'integer', example: 200 },
                        completion_percentage: { type: 'number', format: 'float', example: 80.0 },
                        targeted_end_date: { type: ['string', 'null'], example: '2026-12-31' }
                    }
                }
            }
        },
        security: [{ bearerAuth: [] }],
        tags: [
            { name: 'Business Auth', description: 'Business/Admin level authentication APIs' },
            { name: 'Operator Auth', description: 'Operator level authentication APIs' },
            { name: 'Shifts', description: 'Shift management APIs' },
            { name: 'Machines', description: 'Machine management, downtime, and data ingestion' },
            { name: 'Inventory', description: 'Inventory materials management' },
            { name: 'Quality', description: 'Quality inspection and reporting' },
            { name: 'Machine Checklist', description: 'Machine checklists - safety, cleaning, lubrication check sheets' },
            { name: 'Work Orders', description: 'Work order CRUD, machine assignment, and production tracking' },
            { name: 'Workflows', description: 'Workflow steps management for work orders' },
            { name: 'Production', description: 'Production recording and ingestion' },
            { name: 'Operators', description: 'Operator checklist, rejections, skills, assignments, breakdowns' },
            { name: 'Dashboard', description: 'Business dashboard overview and analytics' },
            { name: 'Scheduling', description: 'Production scheduling APIs' },
            { name: 'Notifications', description: 'Notification management' },
            { name: 'Alerts', description: 'System alerts and warnings' },
            { name: 'Audit Logs', description: 'Audit logs for system activities' },
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
                    responses: {
                        '200': {
                            description: 'Machine details with current_run counts',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['success', 'data'],
                                        properties: {
                                            success: { type: 'boolean', example: true },
                                            data: { $ref: '#/components/schemas/MachineDetailsData' }
                                        },
                                        additionalProperties: true
                                    }
                                }
                            }
                        },
                        '404': {
                            description: 'Machine not found',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                        }
                    }
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
                    responses: {
                        '200': {
                            description: 'Visualization data',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['success', 'data'],
                                        properties: {
                                            success: { type: 'boolean', example: true },
                                            data: { $ref: '#/components/schemas/MachineVisualizationData' }
                                        },
                                        additionalProperties: true
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/machines/{machineId}/dashboard': {
                get: {
                    tags: ['Machines'], summary: 'Get machine dashboard',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: {
                        '200': {
                            description: 'Machine dashboard data',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/MachineDashboard' } } }
                        }
                    }
                }
            },
            '/machines/{machineId}/history': {
                get: {
                    tags: ['Machines'], summary: 'Get machine run history',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: {
                        '200': {
                            description: 'Machine history',
                            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/MachineHistoryItem' } } } }
                        }
                    }
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
                    responses: {
                        '200': {
                            description: 'Downtime analysis',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['success', 'data'],
                                        properties: {
                                            success: { type: 'boolean', example: true },
                                            data: { $ref: '#/components/schemas/DowntimeAnalysisData' }
                                        },
                                        additionalProperties: true
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/machines/{machineId}/downtime': {
                get: {
                    tags: ['Machines'], summary: 'Get downtime history',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: {
                        '200': {
                            description: 'Downtime records',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['success', 'data'],
                                        properties: {
                                            success: { type: 'boolean', example: true },
                                            data: {
                                                type: 'array',
                                                items: { $ref: '#/components/schemas/MachineDowntimeRecord' }
                                            }
                                        },
                                        additionalProperties: true
                                    }
                                }
                            }
                        }
                    }
                },
                post: {
                    tags: ['Machines'], summary: 'Record machine downtime',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['start_time'], properties: { reason: { type: 'string' }, severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] }, start_time: { type: 'string', format: 'date-time' }, end_time: { type: 'string', format: 'date-time' } } } } } },
                    responses: {
                        '201': {
                            description: 'Downtime recorded',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['success', 'data'],
                                        properties: {
                                            success: { type: 'boolean', example: true },
                                            data: { $ref: '#/components/schemas/MachineDowntimeRecord' }
                                        },
                                        additionalProperties: true
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/machines/{machineId}/stop': {
                post: {
                    tags: ['Machines'], summary: 'Stop a running machine',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: {
                        '200': {
                            description: 'Machine stopped',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/MachineStopResponse' } } }
                        }
                    }
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
                        '200': {
                            description: 'Hourly slots array. period=last_24_hours. slots[].hour_label, hour_start, hour_end, total_count, accepted_count, rejected_count.',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['success', 'data'],
                                        properties: {
                                            success: { type: 'boolean', example: true },
                                            data: { $ref: '#/components/schemas/HourlyProductionData' }
                                        },
                                        additionalProperties: true
                                    }
                                }
                            }
                        },
                        '404': {
                            description: 'Machine not found',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                        }
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
                        '200': {
                            description: '31-day array. period=last_31_days. days[].date, day_label, total_count, accepted_count, rejected_count.',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['success', 'data'],
                                        properties: {
                                            success: { type: 'boolean', example: true },
                                            data: { $ref: '#/components/schemas/DailyProductionData' }
                                        },
                                        additionalProperties: true
                                    }
                                }
                            }
                        },
                        '404': {
                            description: 'Machine not found',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                        }
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
                        '200': {
                            description: 'Month-wise array for range. period=custom. months[].month, month_label, production, accepted_count, rejected_count. total_months shows count of months in range.',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['success', 'data'],
                                        properties: {
                                            success: { type: 'boolean', example: true },
                                            data: { $ref: '#/components/schemas/CustomProductionData' }
                                        },
                                        additionalProperties: true
                                    }
                                }
                            }
                        },
                        '400': {
                            description: 'start_date and end_date are required, start_date must not be after end_date',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                        },
                        '404': {
                            description: 'Machine not found',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                        }
                    }
                }
            },
            '/ingest/{pathId}': {
                post: {
                    tags: ['Machines'], summary: 'Ingest machine data (sensor/counter)',
                    parameters: [{ name: 'pathId', in: 'path', required: true, schema: { type: 'string' }, description: 'Machine ingest path ID' }],
                    responses: {
                        '200': {
                            description: 'Data received',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/MachineIngestResponse' } } }
                        },
                        '404': {
                            description: 'Machine not found',
                            content: { 'application/json': { schema: { type: 'object', required: ['message'], properties: { message: { type: 'string', example: 'Machine not found for path: /cnc1' } }, additionalProperties: true } } }
                        }
                    }
                }
            },

            // ═══════════════════════════════════════════════
            // MACHINE CHECKLIST
            // ═══════════════════════════════════════════════
            '/checklist': {
                get: { tags: ['Machine Checklist'], summary: 'Get all checklists grouped by machine', responses: { '200': { description: 'All checklists' } } }
            },
            '/checklist/summary': {
                get: { tags: ['Machine Checklist'], summary: 'Get checklist summary (completion stats per machine)', responses: { '200': { description: 'Summary data with checklist_status = NOT_STARTED, PENDING, or COMPLETED per machine' } } }
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
                    responses: { '200': { description: 'Machine checklist with items ordered by sort_order, including checklist_loaded_at, last_saved_on, and checklist_status (NOT_STARTED/PENDING/COMPLETED)' }, '404': { description: 'Machine not found' } }
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
                        '200': {
                            description: 'work_order_id, work_order_name, target, produced, accepted, rejected, remaining, completion_percentage',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['success', 'data'],
                                        properties: {
                                            success: { type: 'boolean', example: true },
                                            data: { $ref: '#/components/schemas/WorkOrderProductionSummaryData' }
                                        },
                                        additionalProperties: true
                                    }
                                }
                            }
                        },
                        '404': {
                            description: 'Work order not found',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                        }
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
                        '200': {
                            description: 'machines[]: machine_id, machine_name, stage_order, is_last_stage, produced_count, accepted_count, rejected_count',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['success', 'data'],
                                        properties: {
                                            success: { type: 'boolean', example: true },
                                            data: { $ref: '#/components/schemas/WorkOrderMachineProductionData' }
                                        },
                                        additionalProperties: true
                                    }
                                }
                            }
                        },
                        '404': {
                            description: 'Work order not found',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                        }
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
                        '200': {
                            description: 'Final WO summary or machine-grouped data',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['success', 'data'],
                                        properties: {
                                            success: { type: 'boolean', example: true },
                                            data: {
                                                oneOf: [
                                                    { $ref: '#/components/schemas/WorkOrderFinalSummaryData' },
                                                    { $ref: '#/components/schemas/WorkOrderMachineProductionData' }
                                                ]
                                            }
                                        },
                                        additionalProperties: true
                                    }
                                }
                            }
                        },
                        '404': {
                            description: 'Work order not found',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                        }
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
                    responses: {
                        '201': {
                            description: 'Production recorded',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['success', 'data'],
                                        properties: {
                                            success: { type: 'boolean', example: true },
                                            message: { type: 'string', example: 'Production recorded' },
                                            data: { $ref: '#/components/schemas/ProductionRecordedData' }
                                        },
                                        additionalProperties: true
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/production/ingest': {
                post: {
                    tags: ['Production'], summary: 'Ingest production data',
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['machine_id'], properties: { machine_id: { type: 'string' }, work_order_id: { type: 'string' }, produced_count: { type: 'integer' }, rejected_count: { type: 'integer' } } } } } },
                    responses: {
                        '200': {
                            description: 'Production ingested',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['success', 'data'],
                                        properties: {
                                            success: { type: 'boolean', example: true },
                                            message: { type: 'string', example: 'Production ingested' },
                                            data: { $ref: '#/components/schemas/ProductionRecordedData' }
                                        },
                                        additionalProperties: true
                                    }
                                }
                            }
                        }
                    }
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
            },

            // ═══════════════════════════════════════════════
            // SHIFTS
            // ═══════════════════════════════════════════════
            '/shifts': {
                post: {
                    tags: ['Shifts'],
                    summary: 'Create shift',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['shift_name', 'start_time', 'end_time'],
                                    properties: {
                                        shift_name: { type: 'string', example: 'Morning Shift' },
                                        start_time: { type: 'string', format: 'date-time', example: '2026-04-29T08:00:00.000Z' },
                                        end_time: { type: 'string', format: 'date-time', example: '2026-04-29T16:00:00.000Z' }
                                    }
                                }
                            }
                        }
                    },
                    responses: { '201': { description: 'Shift created' }, '400': { description: 'Validation error' } }
                },
                get: { tags: ['Shifts'], summary: 'Get all shifts', responses: { '200': { description: 'List of shifts' } } }
            },
            '/shifts/current': {
                get: { tags: ['Shifts'], summary: 'Get current active shift', responses: { '200': { description: 'Current shift (or message if none active)' } } }
            },
            '/shifts/assign': {
                post: {
                    tags: ['Shifts'],
                    summary: 'Assign operator to shift',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['operator_id', 'shift_id', 'date'],
                                    properties: {
                                        operator_id: { type: 'integer', example: 12 },
                                        shift_id: { type: 'integer', example: 3 },
                                        date: { type: 'string', format: 'date', example: '2026-04-29' }
                                    }
                                }
                            }
                        }
                    },
                    responses: { '201': { description: 'Operator assigned to shift' }, '400': { description: 'Validation error' } }
                }
            },
            '/shifts/{shiftId}/performance': {
                get: {
                    tags: ['Shifts'],
                    summary: 'Get shift performance',
                    parameters: [{ name: 'shiftId', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: { '200': { description: 'Shift performance data' } }
                }
            },

            // ═══════════════════════════════════════════════
            // INVENTORY
            // ═══════════════════════════════════════════════
            '/inventory/materials': {
                post: {
                    tags: ['Inventory'],
                    summary: 'Add material',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['material_name'],
                                    properties: {
                                        material_name: { type: 'string', example: 'Cooking Oil' },
                                        quantity: { type: 'number', example: 1500 },
                                        unit: { type: 'string', example: 'ml' }
                                    }
                                }
                            }
                        }
                    },
                    responses: { '201': { description: 'Material created' }, '400': { description: 'Validation error' } }
                },
                get: { tags: ['Inventory'], summary: 'Get all materials', responses: { '200': { description: 'Materials list' } } }
            },
            '/inventory/consume': {
                post: {
                    tags: ['Inventory'],
                    summary: 'Consume material',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['material_id', 'quantity_used'],
                                    properties: {
                                        material_id: { type: 'integer', example: 1 },
                                        work_order_id: { type: 'string', example: 'WO-2026-001' },
                                        quantity_used: { type: 'number', example: 120 }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': { description: 'Material consumed' },
                        '400': { description: 'Validation error / insufficient stock' },
                        '404': { description: 'Material not found' }
                    }
                }
            },

            // ═══════════════════════════════════════════════
            // QUALITY
            // ═══════════════════════════════════════════════
            '/quality/inspection': {
                post: {
                    tags: ['Quality'],
                    summary: 'Record inspection',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['machine_id'],
                                    properties: {
                                        machine_id: { type: 'string', example: 'MACH-A1B2C3D4' },
                                        work_order_id: { type: 'string', example: 'WO-2026-001' },
                                        parameters: { type: 'object', additionalProperties: true, example: { thickness_mm: 2.1, color: 'golden' } },
                                        status: { type: 'string', example: 'PASS' },
                                        remarks: { type: 'string', example: 'Minor scratch on edge' }
                                    }
                                }
                            }
                        }
                    },
                    responses: { '201': { description: 'Inspection recorded' }, '400': { description: 'Validation error' } }
                }
            },
            '/quality/reports': {
                get: {
                    tags: ['Quality'],
                    summary: 'Get quality reports',
                    parameters: [
                        { name: 'work_order_id', in: 'query', schema: { type: 'string' }, required: false },
                        { name: 'machine_id', in: 'query', schema: { type: 'string' }, required: false }
                    ],
                    responses: { '200': { description: 'Quality reports data' } }
                }
            },

            // ═══════════════════════════════════════════════
            // SCHEDULING
            // ═══════════════════════════════════════════════
            '/scheduling/plan': {
                post: {
                    tags: ['Scheduling'],
                    summary: 'Create production plan',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['work_order_id', 'machine_id', 'start_time', 'end_time'],
                                    properties: {
                                        work_order_id: { type: 'string', example: 'WO-2026-001' },
                                        machine_id: { type: 'string', example: 'MACH-A1B2C3D4' },
                                        start_time: { type: 'string', format: 'date-time', example: '2026-04-29T08:00:00.000Z' },
                                        end_time: { type: 'string', format: 'date-time', example: '2026-04-29T16:00:00.000Z' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '201': { description: 'Plan created' },
                        '400': { description: 'Validation error' },
                        '404': { description: 'Work order or machine not found' }
                    }
                }
            },
            '/scheduling': {
                get: { tags: ['Scheduling'], summary: 'Get full schedule', responses: { '200': { description: 'Schedule list' } } }
            },
            '/scheduling/machine/{machineId}': {
                get: {
                    tags: ['Scheduling'],
                    summary: 'Get machine schedule',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Machine schedule data' } }
                }
            },

            // ═══════════════════════════════════════════════
            // AUDIT LOGS
            // ═══════════════════════════════════════════════
            '/audit-logs': {
                get: {
                    tags: ['Audit Logs'],
                    summary: 'Get audit logs',
                    parameters: [
                        { name: 'limit', in: 'query', schema: { type: 'integer' }, required: false, example: 100 },
                        { name: 'offset', in: 'query', schema: { type: 'integer' }, required: false, example: 0 },
                        { name: 'entity_type', in: 'query', schema: { type: 'string' }, required: false, example: 'work_orders' },
                        { name: 'entity_id', in: 'query', schema: { type: 'string' }, required: false, example: '1' }
                    ],
                    responses: { '200': { description: 'Audit logs list' } }
                }
            }
        }
    },
    apis: []
};

const swaggerSpec = swaggerJsdoc(options);

// --- Ensure every response has a response-body schema ---
// Many endpoints in this repo only define `responses.*.description` today.
// The code below injects a consistent OpenAPI `responses.*.content` schema
// so Swagger UI can show the response JSON structure for both success and error.
const SUCCESS_SCHEMA_REF = { $ref: '#/components/schemas/SuccessResponse' };
const ERROR_SCHEMA_REF = { $ref: '#/components/schemas/ErrorResponse' };

const ensureResponseSchemas = (spec) => {
    if (!spec || !spec.paths || typeof spec.paths !== 'object') return spec;

    const httpMethods = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head']);

    const setJsonContentSchema = (responseObj, schemaRef) => {
        if (!responseObj || typeof responseObj !== 'object') return;
        responseObj.content = responseObj.content || {};
        const existing = responseObj.content['application/json'] || {};
        // Don't override a schema that was explicitly authored in the swagger paths.
        // This is important for endpoint-specific `data` schemas.
        if (existing && existing.schema) return;

        responseObj.content['application/json'] = { ...existing, schema: schemaRef };
    };

    for (const path of Object.keys(spec.paths)) {
        const pathItem = spec.paths[path];
        if (!pathItem || typeof pathItem !== 'object') continue;

        for (const method of Object.keys(pathItem)) {
            if (!httpMethods.has(method)) continue;
            const operation = pathItem[method];
            if (!operation || typeof operation !== 'object') continue;
            if (!operation.responses || typeof operation.responses !== 'object') continue;

            for (const [statusCode, responseObj] of Object.entries(operation.responses)) {
                if (!responseObj || typeof responseObj !== 'object') continue;

                const statusNum = parseInt(String(statusCode), 10);
                if (!Number.isNaN(statusNum) && statusNum >= 400 && statusNum < 600) {
                    setJsonContentSchema(responseObj, ERROR_SCHEMA_REF);
                } else {
                    // Treat 2xx and unknown/default as success envelope.
                    setJsonContentSchema(responseObj, SUCCESS_SCHEMA_REF);
                }
            }
        }
    }

    return spec;
};

ensureResponseSchemas(swaggerSpec);
module.exports = swaggerSpec;
