import { useUser } from '@clerk/react'
import React, { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '@clerk/react';
import toast from 'react-hot-toast';

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

const Community = () => {

  const [creations,setCreations] = useState([])
  const [ setloading] = useState(true)
  const {user} = useUser()
  
  const {getToken} = useAuth()

  const fetchCreations =async()=>{
    try {
      const {data} = await axios.get('/api/user/get-published-creations',{
        headers : {Authorization : `Bearer ${await getToken()}`}
      })
      if (data.creations) {
        setCreations(data.creations)
      }else{
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
    setloading(false)
  }
  

  useEffect(()=>{
    if(user){
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchCreations()
    }
  },[user])

  return (
    <div className='flex-1 h-full flex flex-col gap-4 p-6'>
      Creations
      <div className='bg-white h-full w-full rounded-xl overflow-y-scroll'>
        {creations.map((creations, index)=>(
          <div key={index} className='relative group inline-block pl-3 pt-3 w-full
          sm:max-w-1/2 lg:max-w-1/3'>
            <img src={creations.content} alt="image" className='w-full h-full
            object-cover rounded-lg'/>
            <div className='absolute bottom-0 top-0 right-0 left-3 flex gap-2
            items-end justify-end group-hover:justify-between p-3
            group-hover:bg-linear-to-b from-transparent to-black/80 text-whitw
            rounded-lg'>
              <p className='text-sm hidden group-hover:block'>{creations.prompt}</p>
              <div className='flex gap-1 items-center'>
                <p>{creations.likes.length}</p>
                <Heart className={`min-w-5 h-5 hover:scale-110 cursor-pointer 
                  ${creations.likes.includes(user.id) ? 'fill-red-500 text-red-600':'text-white'}`}/>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Community
