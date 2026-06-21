'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, AlertCircle } from 'lucide-react'

interface PayrollDetailModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  employeeName: string
  period: string
  payrollData: any
  onApprove: () => void
  isApproving: boolean
}

export function PayrollDetailModal({
  isOpen,
  onOpenChange,
  employeeName,
  period,
  payrollData,
  onApprove,
  isApproving,
}: PayrollDetailModalProps) {
  if (!payrollData) return null

  const {
    gross_salary,
    isapres,
    afp,
    renta,
    other_deductions,
    net_salary,
    status,
  } = payrollData

  // Verify calculations
  const totalDeductions = (isapres || 0) + (afp || 0) + (renta || 0) + (other_deductions || 0)
  const calculatedNetSalary = gross_salary - totalDeductions
  const isCalculationCorrect = Math.abs(calculatedNetSalary - net_salary) < 0.01

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalle de Planilla</DialogTitle>
          <DialogDescription>
            {employeeName} - Período {period}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Verification Badge */}
          <div
            className={`flex items-center gap-2 p-3 rounded-lg ${
              isCalculationCorrect
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            {isCalculationCorrect ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Los cálculos son correctos
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm font-medium text-red-800">
                  Error en los cálculos
                </span>
              </>
            )}
          </div>

          {/* Salary Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Desglose de Salario</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Gross Salary */}
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="font-medium text-gray-700">Salario Base</span>
                <span className="text-lg font-bold text-blue-600">
                  ${gross_salary.toFixed(2)}
                </span>
              </div>

              {/* Deductions Header */}
              <div className="mt-4 mb-2">
                <h4 className="font-semibold text-gray-700 text-sm">Descuentos</h4>
              </div>

              {/* ISSS */}
              <div className="flex justify-between items-center p-2 border-b">
                <span className="text-gray-600">ISSS (3% techo $30)</span>
                <span className="text-red-600 font-medium">
                  -${(isapres || 0).toFixed(2)}
                </span>
              </div>

              {/* AFP */}
              <div className="flex justify-between items-center p-2 border-b">
                <span className="text-gray-600">AFP</span>
                <span className="text-red-600 font-medium">
                  -${(afp || 0).toFixed(2)}
                </span>
              </div>

              {/* Ausencias */}
              {other_deductions > 0 && (
                <div className="flex justify-between items-center p-2 border-b">
                  <span className="text-gray-600">Ausencias No Pagadas</span>
                  <span className="text-red-600 font-medium">
                    -${(other_deductions || 0).toFixed(2)}
                  </span>
                </div>
              )}

              {/* RENTA */}
              <div className="flex justify-between items-center p-2 border-b">
                <span className="text-gray-600">RENTA (ISR)</span>
                <span className="text-red-600 font-medium">
                  -${(renta || 0).toFixed(2)}
                </span>
              </div>

              {/* Total Deductions */}
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg mt-4">
                <span className="font-semibold text-gray-700">Total Descuentos</span>
                <span className="text-lg font-bold text-gray-700">
                  -${totalDeductions.toFixed(2)}
                </span>
              </div>

              {/* Net Salary */}
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="font-bold text-gray-700">Salario Neto</span>
                <span className="text-xl font-bold text-green-600">
                  ${net_salary.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Verification Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Verificación de Cálculos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Salario Base:</span>
                <span className="font-mono">${gross_salary.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Menos Total Descuentos:</span>
                <span className="font-mono">-${totalDeductions.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Igual Salario Neto:</span>
                <span className="font-mono">${calculatedNetSalary.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span>Salario Neto Registrado:</span>
                <span className="font-mono">${net_salary.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Diferencia:</span>
                <span className="font-mono">
                  ${Math.abs(calculatedNetSalary - net_salary).toFixed(4)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Status and Actions */}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cerrar
            </Button>
            {status === 'draft' && (
              <Button
                onClick={onApprove}
                disabled={isApproving || !isCalculationCorrect}
                className="bg-green-600 hover:bg-green-700"
              >
                {isApproving ? 'Aprobando...' : 'Aprobar Planilla'}
              </Button>
            )}
            {status === 'approved' && (
              <Button disabled className="bg-green-100 text-green-700">
                ✓ Aprobada
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
