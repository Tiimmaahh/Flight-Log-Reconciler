import React from 'react';
import {type Day,type Aircraft,fmt,signed} from './core.ts';
import {overviewSummary,monthComparison,yearAnalysis,analysisDelta,yearCards,overviewCardYear} from './overview.ts';
const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
export function OverviewPanel({days,aircraftId,year,month,openMonth,totalTime}:{totalTime?:Aircraft['totalTime'];days:Day[];aircraftId:string;year:number;month:number;openMonth:(year:number,month:number)=>void}){
 const summary=overviewSummary(days,aircraftId,year);
 const yearly=summary.years.map(year=>yearAnalysis(summary.months,year,undefined,summary.excludedMonths));
 const cardYear=overviewCardYear(days,aircraftId,year);
 const currentYear=yearCards(days,aircraftId,cardYear,totalTime),previousYear=yearCards(days,aircraftId,cardYear-1,totalTime);
 const cardTime=(minutes:number|null)=>fmt(minutes===null?null:Math.round(minutes));
 const cards=[['allTimeTotal',totalTime?'Aircraft total time':'All-time total'],['dailyAverage','Daily average'],['monthlyAverage','Monthly average'],['yearTotal','Year total']]as const;
 const delta=analysisDelta(summary.months,summary.comparisonYear,summary.excludedMonths);
 const metrics=[['total','Total'],['average','Average'],['variance','Variance (hrs²)']]as const;
 const analysisValue=(value:number|null,metric:string,isDelta=false)=>value===null?'—':metric==='variance'?`${isDelta&&value>0?'+':''}${value.toFixed(2)}`:isDelta?signed(Math.round(value)):fmt(Math.round(value));
 return <>
  <div className="section-title"><div><h2>Flight time overview</h2><span className="overview-source">Log book · {year}</span></div><button className="enter-times" onClick={()=>openMonth(year,month)}>Enter times →</button></div>
  <div className="totals overview-totals four-cards">{cards.map(([key,label])=><div key={key} title={key==='allTimeTotal'?`Recorded time through ${cardYear}`:undefined}><span>{label} <em>{cardYear}</em></span><strong>{cardTime(currentYear[key])}</strong><small>{cardYear-1} <b>{cardTime(previousYear[key])}</b></small></div>)}</div>
  <div className="table-scroll year-comparison-scroll"><table className="overview-table year-comparison" style={{'--year-column-width':`${Math.max(80,120-(summary.years.length-2)*10)}px`,'--year-cell-padding':`${Math.max(8,18-(summary.years.length-2)*3)}px`} as React.CSSProperties}><thead><tr><th>Month</th>{summary.years.map(y=><th key={y}>{y}</th>)}<th>Delta <span>{summary.comparisonYear} − {summary.previousYear}</span></th></tr></thead>
   <tbody>{months.map((month,index)=>{const {delta}=monthComparison(summary.months,index+1,summary.comparisonYear);return <tr key={month}><td>{month}</td>{summary.years.map(y=>{const minutes=summary.months.get(`${y}-${String(index+1).padStart(2,'0')}`)??null;return <td key={y}><button className="year-time" aria-label={`Open ${month} ${y}`} onClick={()=>openMonth(y,index+1)}>{fmt(minutes)}</button></td>;})}<td className={delta?'year-change':''}>{signed(delta)}</td></tr>;})}</tbody>
   <tfoot>{metrics.map(([metric,label])=><tr key={metric}><th scope="row">{label}</th>{yearly.map((stats,i)=><td key={summary.years[i]}>{analysisValue(stats[metric],metric)}</td>)}<td>{analysisValue(delta[metric],metric,true)}</td></tr>)}</tfoot>
  </table></div>
  <p className="hint overview-basis">HH:MM · Daily and monthly averages use entered days and months in each year, including zero-time entries. Months with estimated dates are excluded from daily and monthly averages, including the Average row and its delta. Their hours remain in totals. All-time totals include recorded time through the labeled year. Blank periods are excluded. Summary deltas use months entered in both years. Variance measures monthly spread in hours squared and requires at least two entered months.</p>
 </>;
}
