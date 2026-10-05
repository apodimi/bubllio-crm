import { useState } from 'react'
import AddRounded from '@mui/icons-material/AddRounded'
import { Alert, Box, Button, Chip, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import { CreateDialog } from '../../components/common/CreateDialog'
import { Empty, Failure, Loading, PageHeading } from '../../components/common/Feedback'
import { useCompanies } from '../../features/companies'
import { dealKeys, useDeals, useUpdateDeal } from '../../features/deals'
import { canCreateRecords, organizationPath, useWorkspace } from '../../features/organizations'
import type { DealStage } from '../../types/deal.types'

const stages: Array<{value:DealStage;label:string}> = [{value:'lead',label:'Lead'},{value:'qualified',label:'Qualified'},{value:'proposal',label:'Proposal'},{value:'negotiation',label:'Negotiation'},{value:'won',label:'Won'},{value:'lost',label:'Lost'}]
const money = (value:string,currency:string) => new Intl.NumberFormat(undefined,{style:'currency',currency}).format(Number(value))

export function DealsPage(){
  const org=useWorkspace(); const deals=useDeals(org.id); const companies=useCompanies(org.id,{archived:'active'}); const update=useUpdateDeal(org.id); const [create,setCreate]=useState(false)
  const rows=deals.data??[]; const open=rows.filter(d=>!['won','lost'].includes(d.stage))
  const forecasts=Object.values(open.reduce<Record<string,{currency:string;total:number;weighted:number}>>((totals,deal)=>{
    const current=totals[deal.currency]??{currency:deal.currency,total:0,weighted:0}
    current.total+=Number(deal.value)
    current.weighted+=Number(deal.value)*deal.probability/100
    totals[deal.currency]=current
    return totals
  },{}))
  return <>
    <PageHeading title="Sales pipeline" description="Turn active conversations into predictable revenue." action={canCreateRecords(org)?<Button variant="contained" startIcon={<AddRounded/>} disabled={!companies.data?.length} onClick={()=>setCreate(true)}>Add deal</Button>:null}/>
    <Stack direction="row" spacing={1.5} useFlexGap sx={{mb:3,flexWrap:'wrap'}}>
      <Chip label={`${open.length} open deals`} variant="outlined"/>
      {forecasts.map(forecast=><Box key={forecast.currency} sx={{display:'contents'}}><Chip label={`${money(String(forecast.total),forecast.currency)} pipeline`} color="primary" variant="outlined"/><Chip label={`${money(String(forecast.weighted),forecast.currency)} weighted forecast`} variant="outlined"/></Box>)}
    </Stack>
    {update.isError?<Alert severity="error" sx={{mb:2}}>{update.error.message}</Alert>:null}
    {deals.isPending||companies.isPending?<Loading/>:deals.isError?<Failure error={deals.error} retry={()=>void deals.refetch()}/>:rows.length===0?<Empty title="Build your first pipeline" description="Add an opportunity and move it forward as the conversation develops."/>:<Box sx={{display:'grid',gridTemplateColumns:{xs:'minmax(280px,1fr)',lg:'repeat(6,minmax(220px,1fr))'},gap:2,overflowX:'auto',pb:2}}>{stages.map(stage=>{const items=rows.filter(d=>d.stage===stage.value);return <Paper key={stage.value} variant="outlined" sx={{p:2,minHeight:300,bgcolor:'background.default'}}><Stack direction="row" sx={{justifyContent:'space-between',alignItems:'center',mb:2}}><Typography sx={{fontWeight:800}}>{stage.label}</Typography><Chip size="small" label={items.length}/></Stack><Stack spacing={1.5}>{items.map(deal=><Paper key={deal.id} variant="outlined" sx={{p:2,bgcolor:'background.paper'}}><Typography sx={{fontWeight:750}}>{deal.title}</Typography><Typography variant="body2" color="text.secondary" sx={{mt:.5}}>{deal.company_name}</Typography><Typography variant="h6" sx={{mt:2}}>{money(deal.value,deal.currency)}</Typography><Typography variant="caption" color="text.secondary">{deal.probability}% probability{deal.expected_close_date?` · ${deal.expected_close_date}`:''}</Typography><TextField select size="small" fullWidth label="Stage" value={deal.stage} sx={{mt:2}} onChange={e=>update.mutate({id:deal.id,body:{stage:e.target.value as DealStage,lost_reason:e.target.value==='lost'?'Not specified':deal.lost_reason}})}>{stages.map(s=><MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}</TextField></Paper>)}</Stack></Paper>})}</Box>}
    {create&&companies.data?<CreateDialog title="Add deal" path={`${organizationPath(org.id)}deals/`} invalidate={dealKeys.list(org.id)} onClose={()=>setCreate(false)} fields={[{name:'title',label:'Deal title',required:true,maxLength:255},{name:'company',label:'Company',required:true,options:companies.data.map(c=>({value:c.id,label:c.name}))},{name:'value',label:'Value',required:true,type:'number'},{name:'currency',label:'Currency',required:true,options:[{value:'EUR',label:'EUR'},{value:'USD',label:'USD'},{value:'GBP',label:'GBP'}]},{name:'probability',label:'Probability %',type:'number'},{name:'expected_close_date',label:'Expected close date',type:'date'}]}/>:null}
  </>
}
